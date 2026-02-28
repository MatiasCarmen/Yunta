'use client';
import { useJuntaSync } from '@/hooks/useJuntaSync';

import { enqueuePendingPayment, getPendingPayments, deletePending } from '@/database/local';
import { CuentaDestino } from '@prisma/client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format, addDays, differenceInDays, startOfDay, isSameDay, parseISO, isAfter, isBefore, startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users, Calendar, History, CheckCircle2, ChevronLeft,
  Banknote, Plus, Trash2,
  Wand2, ArrowRight, Loader2, Wallet, ChevronDown, ChevronUp,
  Clock, Eye, Lock, Unlock, Download, FileText, AlertTriangle, Settings, X, ArrowLeft, RotateCcw, Archive, FolderArchive, BookOpen
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

// --- SERVER ACTIONS ---
import {
  createJunta,
  getActiveJunta,
  recordPayment,
  closeDay,
  rescheduleTurn,
  getParticipantKardex,
  JuntaState,
  KardexReport,
  KardexDay,
  TransactionInput,
  PaymentMethod,
  PaymentDestination
} from '@/app/actions/junta';

import {
  archiveJunta,
  getArchivedJuntas,
  getJuntaArchiveReport,
  duplicateJunta,
  ArchivedJuntaSummary,
  JuntaFinalReport
} from '@/app/actions/junta-archive';

// --- UI COMPONENTS (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { NotebookModal } from '@/components/junta/NotebookModal';
import FloatingCalculator from '@/components/junta/FloatingCalculator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- HELPER FUNCTIONS ---

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const generateUUID = () => crypto.randomUUID();
const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

type DayStatus = 'PENDIENTE' | 'PARCIAL' | 'COMPLETO' | 'VENCIDO' | 'ADELANTADO';

type DaySchedule = {
  date: string;
  beneficiaryId: string | null;
  isClosed: boolean;
  isLocked?: boolean;
  expectedAmounts?: Record<string, number>;
  collectedAmounts?: Record<string, number>;
  transactions?: Array<{
    id: string;
    participantId: string;
    amount: number;
    createdAt: string;
    targetDate: string;
    method: string;
    destination: string | null;
    notes: string | null;
  }>;
};

const getDayStatusLabel = (
  expected: number,
  collected: number,
  targetDateStr: string
): DayStatus => {
  const today = startOfToday();
  const targetDate = parseISO(targetDateStr);

  if (collected >= expected) return 'COMPLETO';
  if (collected > 0) return 'PARCIAL';

  if (isBefore(targetDate, today)) return 'VENCIDO';
  if (isAfter(targetDate, today)) return 'ADELANTADO';
  if (isSameDay(targetDate, today)) return 'PENDIENTE';

  return 'PENDIENTE';
};

// --- CUSTOM SELECT COMPONENT ---
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 pr-8',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
);
Select.displayName = 'Select';

// --- SCHEMAS ---

const participantSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Nombre requerido'),
  dailyCommitment: z.coerce.number().min(1, 'Mínimo S/ 1'),
});

const configSchema = z.object({
  dateRange: z.object({ from: z.date(), to: z.date() }),
  participants: z.array(participantSchema).min(2, 'Mínimo 2 participantes'),
});

const transactionInputSchema = z.object({
  targetDate: z.string(),
  participantId: z.string(),
  amount: z.number().min(0.01),
  method: z.enum(['CASH', 'YAPE', 'DEBIT', 'CREDIT_BCP'] as any),
  destination: z.nativeEnum(CuentaDestino).nullable().optional(),
  notes: z.string().optional(),
  clientTxId: z.string().optional()
});

type ConfigFormValues = z.infer<typeof configSchema>;

// --- MAIN COMPONENT ---

export default function JuntaPage() {
  const [view, setView] = useState<'CONFIG' | 'DASHBOARD' | 'LOADING' | 'ARCHIVED'>('LOADING');
  const [junta, setJunta] = useState<JuntaState | null>(null);
  const [kardexReport, setKardexReport] = useState<KardexReport | null>(null);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);
  const [kardexError, setKardexError] = useState<string | null>(null);

  // Estados para juntas archivadas
  const [archivedJuntas, setArchivedJuntas] = useState<ArchivedJuntaSummary[]>([]);


  // Estados para diálogos personalizados
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showInput?: boolean;
    inputPlaceholder?: string;
  } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loadingState, setLoadingState] = useState<{ isLoading: boolean; message: string }>({
    isLoading: false,
    message: 'Procesando...'
  });

  // Modal de cerrar día
  const [closeDayModal, setCloseDayModal] = useState<{
    isOpen: boolean;
    date: string;
    dayInfo?: {
      expectedAmount: number;
      collectedAmount: number;
      participantCount: number;
      transactionCount: number;
    };
  } | null>(null);

  // Panel de problemas detectados
  const [isProblemsModalOpen, setIsProblemsModalOpen] = useState(false);
  const [detectedProblems, setDetectedProblems] = useState<{
    participantsWithDebt: Array<{ name: string; debt: number; daysInDebt: number; id: string }>;
    overdueUnlockedDays: number;
    lowComplianceParticipants: Array<{ name: string; complianceRate: number; id: string }>;
  }>({
    participantsWithDebt: [],
    overdueUnlockedDays: 0,
    lowComplianceParticipants: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const active = await getActiveJunta();
        if (active) {
          setJunta(active);
          setView('DASHBOARD');
        } else {
          setView('CONFIG');
        }
      } catch (error) {
        console.error("Failed to load junta:", error);
        setView('CONFIG');
      }
    };
    loadData();
  }, []);

  const handleArchiveJunta = async () => {
    if (!junta) return;

    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Archivar Junta',
      message: 'Se generará un reporte final y la junta quedará marcada como completada. Esta acción no se puede deshacer.',
      showInput: true,
      inputPlaceholder: 'Motivo del archivo (opcional)',
      onConfirm: async () => {
        const reason = inputValue || undefined;
        setConfirmDialog(null);
        setInputValue('');

        setLoadingState({ isLoading: true, message: 'Archivando junta y generando reporte...' });

        try {
          const [result] = await Promise.all([
            archiveJunta(junta.id, reason),
            new Promise(resolve => setTimeout(resolve, 1500)) // Delay mínimo para ver la animación
          ]);
          setLoadingState({ isLoading: false, message: '' });

          if (result.success) {
            setAlertDialog({
              isOpen: true,
              title: '✅ Junta Archivada',
              message: 'La junta se archivó correctamente y se generó el reporte final.',
              type: 'success'
            });
            setTimeout(() => {
              setAlertDialog(null);
              setJunta(null);
              setView('CONFIG');
            }, 2000);
          } else {
            setAlertDialog({
              isOpen: true,
              title: '❌ Error al Archivar',
              message: result.error || 'Ocurrió un error al archivar la junta',
              type: 'error'
            });
            setTimeout(() => setAlertDialog(null), 3000);
          }
        } catch (error) {
          console.error("Error cargando junta:", error);
          setLoadingState({ isLoading: false, message: '' });
          setAlertDialog({
            isOpen: true,
            title: '❌ Error Inesperado',
            message: 'No se pudo completar la operación de archivo',
            type: 'error'
          });
          setTimeout(() => setAlertDialog(null), 3000);
        }
      }
    });
  };

  const handleViewArchived = async () => {
    setLoadingState({ isLoading: true, message: 'Cargando juntas archivadas...' });
    setView('ARCHIVED');

    const [archived] = await Promise.all([
      getArchivedJuntas(),
      new Promise(resolve => setTimeout(resolve, 1200)) // Delay mínimo
    ]);

    setArchivedJuntas(archived);
    setLoadingState({ isLoading: false, message: '' });
  };

  const confirmCloseDay = async () => {
    if (!closeDayModal || !junta) return;

    try {
      setCloseDayModal(null);
      setLoadingState({ isLoading: true, message: 'Cerrando día...' });

      await closeDay(junta.id, closeDayModal.date);
      const updated = await getActiveJunta();

      setLoadingState({ isLoading: false, message: '' });

      if (updated) setJunta(updated);

      setAlertDialog({
        isOpen: true,
        title: '✅ Día Cerrado',
        message: 'El día se cerró correctamente.',
        type: 'success'
      });
      setTimeout(() => setAlertDialog(null), 2500);
    } catch (error) {
      console.error('Error closing day:', error);
      setLoadingState({ isLoading: false, message: '' });
      setAlertDialog({
        isOpen: true,
        title: '❌ Error',
        message: 'No se pudo cerrar el día.',
        type: 'error'
      });
      setTimeout(() => setAlertDialog(null), 3000);
    }
  };

  const handleOpenKardex = async (participantId: string) => {
    if (!junta) return;
    setIsKardexOpen(true);
    setKardexReport(null);
    setKardexError(null);
    setIsLoadingKardex(true);
    try {
      const report = await getParticipantKardex(junta.id, participantId);
      setKardexReport(report);
    } catch (error) {
      console.error('Unable to load kardex:', error);
      setKardexError('No se pudo cargar el kardex. Por favor, intenta nuevamente.');
    } finally {
      setIsLoadingKardex(false);
    }
  };

  const handleCloseKardex = () => {
    setIsKardexOpen(false);
    setKardexReport(null);
    setKardexError(null);
  };

  const handleJuntaCreated = async (newState: JuntaState) => {
    setJunta(newState);
    setView('DASHBOARD');
  };

  // Detectar problemas cuando se abre el modal
  const handleOpenProblemsModal = () => {
    if (!junta) return;

    setIsProblemsModalOpen(true);

    // Calcular problemas en tiempo real
    if (!junta.schedule || junta.schedule.length === 0 || !junta.participants || junta.participants.length === 0) {
      setDetectedProblems({
        participantsWithDebt: [],
        overdueUnlockedDays: 0,
        lowComplianceParticipants: []
      });
      return;
    }

    const today = startOfToday();

    try {
      const participantsWithDebt = junta.participants
        .map(p => {
          const totalExpected = junta.schedule
            .filter(day => day && day.date && (isBefore(parseISO(day.date), today) || isSameDay(parseISO(day.date), today)))
            .reduce((sum: number, day: DaySchedule) => {
              if (!day.expectedAmounts || typeof day.expectedAmounts !== 'object') return sum;
              return sum + (day.expectedAmounts[p.id] || 0);
            }, 0);

          const totalPaid = junta.schedule
            .filter(day => day && day.date && (isBefore(parseISO(day.date), today) || isSameDay(parseISO(day.date), today)))
            .reduce((sum: number, day: DaySchedule) => {
              if (!day.collectedAmounts || typeof day.collectedAmounts !== 'object') return sum;
              return sum + (day.collectedAmounts[p.id] || 0);
            }, 0);

          const debt = totalExpected - totalPaid;
          const daysInDebt = p.dailyCommitment > 0 ? Math.floor(debt / p.dailyCommitment) : 0;

          return { id: p.id, name: p.name, debt, daysInDebt };
        })
        .filter(p => p.daysInDebt >= 3);

      const lowComplianceParticipants = junta.participants
        .map(p => {
          const completedDays = junta.schedule.filter((day: DaySchedule) => {
            if (!day.expectedAmounts || !day.collectedAmounts) return false;
            const expected = day.expectedAmounts[p.id] || 0;
            const collected = day.collectedAmounts[p.id] || 0;
            return collected >= expected;
          }).length;

          const totalActiveDays = junta.schedule.filter(day =>
            day && day.date && (isBefore(parseISO(day.date), today) || isSameDay(parseISO(day.date), today))
          ).length;

          const complianceRate = totalActiveDays > 0 ? (completedDays / totalActiveDays) * 100 : 100;

          return { id: p.id, name: p.name, complianceRate };
        })
        .filter(p => p.complianceRate < 70);

      const overdueUnlockedDays = junta.schedule.filter((day: DaySchedule) => {
        if (!day || !day.date) return false;
        const dayDate = parseISO(day.date);
        return isBefore(dayDate, today) && !day.isLocked;
      });

      setDetectedProblems({
        participantsWithDebt,
        overdueUnlockedDays: overdueUnlockedDays.length,
        lowComplianceParticipants
      });
    } catch (error) {
      console.error('Error al detectar problemas:', error);
      setDetectedProblems({
        participantsWithDebt: [],
        overdueUnlockedDays: 0,
        lowComplianceParticipants: []
      });
    }
  };

  return (
    <>
      <LoadingScreen isLoading={loadingState.isLoading} message={loadingState.message} />

      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-2 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <a
                href="/dashboard"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                title="Volver al dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </a>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 shrink-0" />
                  <span className="truncate">Gestión de Junta</span>
                  <span className="text-[10px] sm:text-xs bg-indigo-100 text-indigo-700 px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0">ADMIN</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {view === 'DASHBOARD' && (
                <>
                  {/* Botón de Caja */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (junta) {
                        window.location.href = `/dashboard/junta/caja?id=${junta.id}`;
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  >
                    <Wallet className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Caja</span>
                  </Button>

                  {/* Botón de Alertas/Problemas */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenProblemsModal}
                    className="border-amber-500 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                  >
                    <AlertTriangle className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Alertas</span>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
                    onClick={handleArchiveJunta}
                  >
                    <Archive className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Archivar</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewArchived}
                    className="h-8 text-xs"
                  >
                    <FolderArchive className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Historial</span>
                  </Button>

                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: '🔄 Reiniciar Sistema',
                      message: '¿Estás seguro de que deseas reiniciar? Se perderá la junta actual sin archivar.',
                      onConfirm: () => {
                        setConfirmDialog(null);
                        setJunta(null);
                        setView('CONFIG');
                      }
                    });
                  }}>
                    <Trash2 className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Reiniciar</span>
                  </Button>
                </>
              )}
              {view === 'ARCHIVED' && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setView('DASHBOARD')}>
                  <ArrowLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Volver</span>
                </Button>
              )}
            </div>
          </header>

          {view === 'LOADING' && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          )}

          {view === 'CONFIG' && <ConfigWizard onComplete={handleJuntaCreated} />}

          {view === 'ARCHIVED' && <ArchivedJuntasView juntas={archivedJuntas} />}

          {view === 'DASHBOARD' && junta && <Dashboard junta={junta} onUpdate={setJunta} onViewDetail={handleOpenKardex} />}

          {isKardexOpen && (
            <KardexModal
              report={kardexReport}
              loading={isLoadingKardex}
              error={kardexError}
              onClose={handleCloseKardex}
            />
          )}

          {/* Diálogo de Confirmación Personalizado */}
          {confirmDialog && confirmDialog.isOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{confirmDialog.message}</p>

                {confirmDialog.showInput && (
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={confirmDialog.inputPlaceholder}
                    className="mt-3"
                  />
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setConfirmDialog(null);
                      setInputValue('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={confirmDialog.onConfirm}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Diálogo de Alerta Personalizado */}
          {alertDialog && alertDialog.isOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${alertDialog.type === 'success' ? 'bg-green-100' :
                    alertDialog.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                    {alertDialog.type === 'success' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                    {alertDialog.type === 'error' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                    {alertDialog.type === 'info' && <AlertTriangle className="w-6 h-6 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{alertDialog.title}</h3>
                    <p className="text-slate-600 text-sm mt-1">{alertDialog.message}</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setAlertDialog(null)}
                >
                  Entendido
                </Button>
              </div>
            </div>
          )}

          {/* Modal de Panel de Problemas/Alertas */}
          {isProblemsModalOpen && junta && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsProblemsModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      Panel de Alertas
                    </h2>
                    <p className="text-amber-100 text-sm mt-1">
                      Problemas detectados en la junta actual
                    </p>
                  </div>
                  <button
                    onClick={() => setIsProblemsModalOpen(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-6">
                  {/* Estado Global */}
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                    <div>
                      <p className="text-sm text-slate-500">Total de Problemas Detectados</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {detectedProblems.participantsWithDebt.length +
                          detectedProblems.lowComplianceParticipants.length +
                          (detectedProblems.overdueUnlockedDays > 0 ? 1 : 0)}
                      </p>
                    </div>
                    {(detectedProblems.participantsWithDebt.length +
                      detectedProblems.lowComplianceParticipants.length +
                      detectedProblems.overdueUnlockedDays) === 0 && (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-8 w-8" />
                          <span className="font-semibold">Todo en orden</span>
                        </div>
                      )}
                  </div>

                  {/* Participantes con Deuda Alta */}
                  {detectedProblems.participantsWithDebt.length > 0 && (
                    <Card className="border-l-4 border-l-red-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          Participantes con Deuda Alta (≥3 días)
                        </CardTitle>
                        <CardDescription>
                          Estos participantes tienen deudas significativas que requieren atención
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {detectedProblems.participantsWithDebt.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-red-50 p-4 rounded-lg">
                              <div>
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <p className="text-sm text-slate-600">
                                  Deuda: <span className="font-mono font-bold text-red-600">S/ {p.debt.toFixed(2)}</span> ({p.daysInDebt} días)
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsProblemsModalOpen(false);
                                  handleOpenKardex(p.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Historial
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Participantes con Bajo Cumplimiento */}
                  {detectedProblems.lowComplianceParticipants.length > 0 && (
                    <Card className="border-l-4 border-l-amber-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-5 w-5" />
                          Bajo Cumplimiento (&lt;70%)
                        </CardTitle>
                        <CardDescription>
                          Participantes con porcentaje de cumplimiento por debajo del estándar
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {detectedProblems.lowComplianceParticipants.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-amber-50 p-4 rounded-lg">
                              <div>
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <p className="text-sm text-slate-600">
                                  Cumplimiento: <span className="font-mono font-bold text-amber-600">{p.complianceRate.toFixed(1)}%</span>
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsProblemsModalOpen(false);
                                  handleOpenKardex(p.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Historial
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Días sin Cerrar */}
                  {detectedProblems.overdueUnlockedDays > 0 && (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                          <Clock className="h-5 w-5" />
                          Días Pasados Sin Cerrar
                        </CardTitle>
                        <CardDescription>
                          Hay días vencidos que aún no han sido cerrados
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-slate-700">
                            <span className="font-bold text-2xl text-blue-600">{detectedProblems.overdueUnlockedDays}</span> día{detectedProblems.overdueUnlockedDays > 1 ? 's' : ''} sin cerrar
                          </p>
                          <p className="text-sm text-slate-600 mt-2">
                            Revisa la tabla de cronograma y cierra los días completados para mantener el registro actualizado.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mensaje cuando no hay problemas */}
                  {detectedProblems.participantsWithDebt.length === 0 &&
                    detectedProblems.lowComplianceParticipants.length === 0 &&
                    detectedProblems.overdueUnlockedDays === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¡Todo en Orden!</h3>
                        <p className="text-slate-600">
                          No se detectaron problemas en la junta actual. Todos los participantes están al día.
                        </p>
                      </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t">
                  <Button
                    variant="default"
                    onClick={() => setIsProblemsModalOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Cerrar Día */}
          {closeDayModal && closeDayModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-full bg-amber-100">
                    <Lock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">¿Cerrar Día?</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {format(parseISO(closeDayModal.date), "EEEE, dd 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                </div>

                {/* Información del Día */}
                {closeDayModal.dayInfo && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-slate-900 text-sm">Resumen del Día</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-xs text-slate-500">Esperado</p>
                        <p className="text-lg font-bold text-slate-900">
                          S/ {closeDayModal.dayInfo.expectedAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-xs text-slate-500">Recaudado</p>
                        <p className="text-lg font-bold text-emerald-600">
                          S/ {closeDayModal.dayInfo.collectedAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Participantes:</span>
                        <span className="font-semibold text-slate-900 ml-1">
                          {closeDayModal.dayInfo.participantCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Transacciones:</span>
                        <span className="font-semibold text-slate-900 ml-1">
                          {closeDayModal.dayInfo.transactionCount}
                        </span>
                      </div>
                    </div>

                    {closeDayModal.dayInfo.collectedAmount < closeDayModal.dayInfo.expectedAmount && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <p className="text-xs text-amber-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Faltan S/ {(closeDayModal.dayInfo.expectedAmount - closeDayModal.dayInfo.collectedAmount).toFixed(2)} por recaudar
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Advertencia */}
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
                  <p className="text-sm text-rose-800">
                    <strong>⚠️ Advertencia:</strong> Al cerrar este día, no se podrán realizar más ediciones simples.
                    Solo un administrador podrá reabrirlo.
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCloseDayModal(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={confirmCloseDay}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Cerrar Día
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- CONFIG WIZARD ---

function ConfigWizard({ onComplete }: { onComplete: (state: JuntaState) => void }) {
  const [step, setStep] = useState(1);
  const [tempConfig, setTempConfig] = useState<ConfigFormValues | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as Resolver<ConfigFormValues>,
    defaultValues: {
      participants: [
        { id: generateUUID(), name: '', dailyCommitment: 0 },
        { id: generateUUID(), name: '', dailyCommitment: 0 }
      ],
      dateRange: { from: new Date(), to: addDays(new Date(), 9) }
    }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'participants' });
  const participants = useWatch({ control: form.control, name: 'participants' });
  const totalPot = participants.reduce((sum, p) => sum + (Number(p.dailyCommitment) || 0), 0);

  const onStep1Submit: SubmitHandler<ConfigFormValues> = (data) => {
    setTempConfig(data);
    setStep(2);
  };

  if (step === 2 && tempConfig) {
    return <ScheduleBuilder config={tempConfig} onBack={() => setStep(1)} onComplete={onComplete} isCreating={isCreating} setIsCreating={setIsCreating} />;
  }

  return (
    <Card className="animate-in fade-in max-w-4xl mx-auto">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Configuración Inicial
        </CardTitle>
        <CardDescription>Define los participantes y el rango de fechas de la junta</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onStep1Submit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Inicio</label>
              <Controller
                control={form.control}
                name="dateRange.from"
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={e => e.target.valueAsDate && field.onChange(startOfDay(e.target.valueAsDate))}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Fin</label>
              <Controller
                control={form.control}
                name="dateRange.to"
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={e => e.target.valueAsDate && field.onChange(startOfDay(e.target.valueAsDate))}
                  />
                )}
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="p-3">Nombre del Participante</th>
                  <th className="p-3">Aporte Diario (S/)</th>
                  <th className="p-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((f, i) => (
                  <tr key={f.id}>
                    <td className="p-2">
                      <Input {...form.register(`participants.${i}.name`)} placeholder="Nombre..." />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        {...form.register(`participants.${i}.dailyCommitment`, {
                          setValueAs: (v) => (v === '' ? 0 : Number(v))
                        })}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {fields.length > 2 && (
                        <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="p-3 font-semibold text-right">Total Diario:</td>
                  <td className="p-3 font-bold text-lg text-indigo-600">S/ {totalPot.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ id: generateUUID(), name: '', dailyCommitment: 0 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Socio
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              Siguiente
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ScheduleBuilder({
  config,
  onBack,
  onComplete,
  isCreating,
  setIsCreating
}: {
  config: ConfigFormValues;
  onBack: () => void;
  onComplete: (s: JuntaState) => void;
  isCreating: boolean;
  setIsCreating: (v: boolean) => void;
}) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    const days = differenceInDays(config.dateRange.to, config.dateRange.from) + 1;
    return Array.from({ length: days }, (_, i) => ({
      date: formatDateKey(addDays(config.dateRange.from, i)),
      beneficiaryId: null,
      isClosed: false
    }));
  });

  const handleFinish = async () => {
    if (schedule.some(d => !d.beneficiaryId)) {
      alert("Asigna todos los beneficiarios.");
      return;
    }

    setIsCreating(true);

    try {
      const juntaData = {
        participants: config.participants,
        dateRange: {
          from: config.dateRange.from.toISOString(),
          to: config.dateRange.to.toISOString()
        },
        schedule
      };

      const result = await createJunta(juntaData);
      if (result.success && result.id) {
        const newJunta = await getActiveJunta();
        if (newJunta) onComplete(newJunta);
      } else {
        throw new Error(result.error || 'Error creando junta');
      }
    } catch (error) {
      console.error('Error creating junta:', error);
      alert('Error al crear la junta. Intenta de nuevo.');
      setIsCreating(false);
    }
  };

  return (
    <Card className="animate-in fade-in max-w-4xl mx-auto">
      <CardHeader className="border-b bg-slate-50/50">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Asignación de Turnos
            </CardTitle>
            <CardDescription>Define quién recibe el pozo cada día</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const shuffled = [...config.participants].sort(() => Math.random() - 0.5);
              setSchedule(schedule.map((d, i) => ({
                ...d,
                beneficiaryId: shuffled[i % shuffled.length]?.id || null
              })));
            }}
          >
            <Wand2 className="w-4 h-4 mr-2" /> Aleatorio
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
          {schedule.map((day, idx) => (
            <div key={day.date} className="p-3 rounded border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-bold text-slate-500">Día {idx + 1}</span>
                <span className="text-slate-600">{format(parseISO(day.date), 'dd MMM', { locale: es })}</span>
              </div>
              <Select
                value={day.beneficiaryId || ''}
                onChange={e => {
                  const newSched = [...schedule];
                  newSched[idx].beneficiaryId = e.target.value;
                  setSchedule(newSched);
                }}
              >
                <option value="">-- Elegir --</option>
                {config.participants.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t flex justify-between">
          <Button variant="ghost" onClick={onBack} disabled={isCreating}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>
          <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finalizar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- DASHBOARD ---

function Dashboard({ junta, onUpdate, onViewDetail }: { junta: JuntaState; onUpdate: (j: JuntaState) => void; onViewDetail: (id: string) => void }) {


  const today = formatDateKey(new Date());
  const hasToday = junta.schedule.some(d => d.date === today);
  const initialDate = hasToday ? today : (junta.schedule.length > 0 ? junta.schedule[0].date : today);

  const [expandedDate, setExpandedDate] = useState<string>(initialDate);
  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [mobileTab, setMobileTab] = useState<'agenda' | 'resumen'>('agenda');

  // Modal de cerrar día
  const [closeDayModal, setCloseDayModal] = useState<{
    isOpen: boolean;
    date: string;
    dayInfo?: {
      expectedAmount: number;
      collectedAmount: number;
      participantCount: number;
      transactionCount: number;
    };
  } | null>(null);

  // Modal de reabrir día
  const [reopenDayModal, setReopenDayModal] = useState<{
    isOpen: boolean;
    date: string;
  } | null>(null);

  // Estado para alertas
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [loadingState, setLoadingState] = useState<{ isLoading: boolean; message: string }>({
    isLoading: false,
    message: 'Procesando...'
  });

  const [offlineStats, setOfflineStats] = useState({ pending: 0, failed: 0 });

  const loadOfflineStats = async () => {
    const pendings = await getPendingPayments();
    setOfflineStats({
      pending: pendings.filter(p => p.status === 'PENDING').length,
      failed: pendings.filter(p => p.status === 'FAILED').length
    });
  };

  useEffect(() => {
    loadOfflineStats();
  }, []);

  const handleRetrySync = async () => {
    setLoadingState({ isLoading: true, message: 'Reintentando sync...' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('online'));
    }
    setTimeout(() => {
      loadOfflineStats();
      setLoadingState({ isLoading: false, message: '' });
    }, 2000);
  };

  const handleDiscardFailed = async () => {
    const pendings = await getPendingPayments();
    for (const p of pendings) {
      if (p.status === 'FAILED' && p.id) {
        await deletePending(p.id);
      }
    }
    loadOfflineStats();
  };

  useJuntaSync(junta.id, async () => {
    const updated = await getActiveJunta();
    if (updated) onUpdate(updated);
    loadOfflineStats();
  });

  const handleAddTransaction = async (txData: TransactionInput) => {
    const parsed = transactionInputSchema.safeParse(txData);
    if (!parsed.success) {
      alert("Validación falló: " + parsed.error.message);
      return;
    }

    const clientTxId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const txPayload = { ...parsed.data, clientTxId } as TransactionInput;

    if (!navigator.onLine) {
      await enqueuePendingPayment(txPayload);
      setAlertDialog({
        isOpen: true,
        title: 'Encolado Offline',
        message: 'No hay conexión. El pago se guardó y se sincronizará automáticamente cuando vuelva internet.',
        type: 'info'
      });
      setTimeout(() => setAlertDialog(null), 3000);
      setShowPayModal(null);
      loadOfflineStats();
      return;
    }

    try {
      setLoadingState({ isLoading: true, message: 'Procesando pago...' });
      const res = await recordPayment(junta.id, txPayload);

      if (!res.success) {
        throw new Error(res.error || 'Error server-side');
      }

      const updated = await getActiveJunta();
      if (updated) onUpdate(updated);
      setShowPayModal(null);
    } catch (error) {
      console.error('Error recording payment:', error);

      await enqueuePendingPayment(txPayload);
      setAlertDialog({
        isOpen: true,
        title: 'Error de Red - Guardado Local',
        message: 'El pago falló por red. Se guardó localmente y se reintentará luego.',
        type: 'info'
      });
      setTimeout(() => setAlertDialog(null), 3500);
      setShowPayModal(null);
      loadOfflineStats();
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  const handleCloseDay = async (date: string) => {
    // Calcular información del día
    const daySchedule = junta.schedule.find(d => d.date === date) as DaySchedule | undefined;
    if (!daySchedule) return;

    const expectedAmount = daySchedule.expectedAmounts && typeof daySchedule.expectedAmounts === 'object'
      ? Object.values(daySchedule.expectedAmounts).reduce((sum: number, val) => sum + (val || 0), 0)
      : 0;

    const collectedAmount = daySchedule.collectedAmounts && typeof daySchedule.collectedAmounts === 'object'
      ? Object.values(daySchedule.collectedAmounts).reduce((sum: number, val) => sum + (val || 0), 0)
      : 0;

    const participantCount = junta.participants?.length || 0;
    const transactionCount = daySchedule.transactions?.length || 0;

    // Mostrar modal de confirmación
    setCloseDayModal({
      isOpen: true,
      date,
      dayInfo: {
        expectedAmount,
        collectedAmount,
        participantCount,
        transactionCount
      }
    });
  };

  const confirmCloseDay = async () => {
    if (!closeDayModal) return;

    try {
      setCloseDayModal(null);
      setLoadingState({ isLoading: true, message: 'Cerrando día...' });

      await closeDay(junta.id, closeDayModal.date);
      const updated = await getActiveJunta();

      setLoadingState({ isLoading: false, message: '' });

      if (updated) onUpdate(updated);

      setAlertDialog({
        isOpen: true,
        title: '✅ Día Cerrado',
        message: 'El día se cerró correctamente. Ya no se pueden editar los registros.',
        type: 'success'
      });
      setTimeout(() => setAlertDialog(null), 2500);
    } catch (error) {
      console.error('Error closing day:', error);
      setLoadingState({ isLoading: false, message: '' });
      setAlertDialog({
        isOpen: true,
        title: '❌ Error',
        message: 'No se pudo cerrar el día. Intenta nuevamente.',
        type: 'error'
      });
      setTimeout(() => setAlertDialog(null), 3000);
    }
  };

  const handleReopenDay = async (date: string) => {
    setReopenDayModal({
      isOpen: true,
      date
    });
  };

  const confirmReopenDay = async () => {
    if (!reopenDayModal) return;

    try {
      setReopenDayModal(null);
      setLoadingState({ isLoading: true, message: 'Reabriendo día...' });

      await closeDay(junta.id, reopenDayModal.date); // toggle
      const updated = await getActiveJunta();

      setLoadingState({ isLoading: false, message: '' });

      if (updated) onUpdate(updated);

      setAlertDialog({
        isOpen: true,
        title: '✅ Día Reabierto',
        message: 'El día se reabrió correctamente. Ahora puedes realizar correcciones.',
        type: 'success'
      });
      setTimeout(() => setAlertDialog(null), 2500);
    } catch (error) {
      console.error('Error reopening day:', error);
      setLoadingState({ isLoading: false, message: '' });
      setAlertDialog({
        isOpen: true,
        title: '❌ Error',
        message: 'No se pudo reabrir el día. Intenta nuevamente.',
        type: 'error'
      });
      setTimeout(() => setAlertDialog(null), 3000);
    }
  };

  const handleBeneficiaryChange = async (date: string, newId: string) => {
    if (!confirm("¿Cambiar el beneficiario del pozo? Esto afecta la programación.")) return;

    try {
      await rescheduleTurn(junta.id, date, newId);
      const updated = await getActiveJunta();
      if (updated) onUpdate(updated);
    } catch (error) {
      console.error('Error changing beneficiary:', error);
      alert('Error al cambiar beneficiario');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      {/* Mobile Tabs */}
      <div className="lg:hidden flex rounded-lg bg-slate-200 p-1 gap-1">
        <button
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-md transition-colors",
            mobileTab === 'agenda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
          onClick={() => setMobileTab('agenda')}
        >
          <Calendar className="w-4 h-4 inline mr-1.5" />Agenda
        </button>
        <button
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-md transition-colors",
            mobileTab === 'resumen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
          onClick={() => setMobileTab('resumen')}
        >
          <Users className="w-4 h-4 inline mr-1.5" />Resumen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* LEFT: AGENDA — visible siempre en desktop, solo en tab "agenda" en mobile */}
        <div className={cn("lg:col-span-8 space-y-4", mobileTab !== 'agenda' && 'hidden lg:block')}>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Agenda de la Junta</h2>

            <div className="flex gap-1 sm:gap-2 items-center flex-wrap">
              {(offlineStats.pending > 0 || offlineStats.failed > 0) && (
                <div className="flex items-center gap-2 bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  {offlineStats.pending > 0 && <span className="text-amber-600">⏳ {offlineStats.pending}</span>}
                  {offlineStats.failed > 0 && <span className="text-red-500">❌ {offlineStats.failed}</span>}
                  <button onClick={handleRetrySync} className="text-indigo-600 hover:underline ml-1">Reintentar</button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowNotebook(true)} className="h-8 px-2 sm:px-3">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Cuaderno</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="h-8 px-2 sm:px-3 text-amber-700 hover:bg-amber-50">
                <FolderArchive className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Archivadas</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {junta.schedule.map((day) => {
              const isExpanded = day.date === expandedDate;
              const beneficiary = junta.participants.find(p => p.id === day.beneficiaryId);
              const dailyTotalExpected = junta.participants.reduce((acc, p) => acc + p.dailyCommitment, 0);

              const dayTxs = junta.ledger.filter(t => t.targetDate === day.date);
              const collected = dayTxs.reduce((acc, t) => acc + t.amount, 0);
              const statusLabel = getDayStatusLabel(dailyTotalExpected, collected, day.date);

              return (
                <DayCard
                  key={day.date}
                  day={day}
                  isExpanded={isExpanded}
                  beneficiary={beneficiary}
                  dailyTotalExpected={dailyTotalExpected}
                  collected={collected}
                  statusLabel={statusLabel}
                  dayTxs={dayTxs}
                  junta={junta}
                  onExpand={() => setExpandedDate(day.date)}
                  onBeneficiaryChange={handleBeneficiaryChange}
                  onCloseDay={handleCloseDay}
                  onReopenDay={handleReopenDay}
                  onShowPayModal={setShowPayModal}
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT: SIDEBAR — visible siempre en desktop, solo en tab "resumen" en mobile */}
        <div className={cn("lg:col-span-4 space-y-4", mobileTab !== 'resumen' && 'hidden lg:block')}>
          <ParticipantsSummaryCard junta={junta} onViewDetail={onViewDetail} />
        </div>
      </div>

      {/* MODALS */}
      {showPayModal && (
        <TransactionModal
          participant={junta.participants.find(p => p.id === showPayModal)!}
          targetDate={expandedDate}
          remainingDebt={
            junta.participants.find(p => p.id === showPayModal)!.dailyCommitment -
            junta.ledger.filter(t => t.participantId === showPayModal && t.targetDate === expandedDate).reduce((acc, t) => acc + t.amount, 0)
          }
          onClose={() => setShowPayModal(null)}
          onSave={handleAddTransaction}
        />
      )}

      {showHistory && <HistoryModal junta={junta} onClose={() => setShowHistory(false)} />}

      {/* Loading Screen */}
      <LoadingScreen isLoading={loadingState.isLoading} message={loadingState.message} />

      {/* Modal de Alerta */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${alertDialog.type === 'success' ? 'bg-green-100' :
                alertDialog.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                {alertDialog.type === 'success' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                {alertDialog.type === 'error' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                {alertDialog.type === 'info' && <AlertTriangle className="w-6 h-6 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{alertDialog.title}</h3>
                <p className="text-slate-600 text-sm mt-1">{alertDialog.message}</p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setAlertDialog(null)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Cerrar Día */}
      {closeDayModal && closeDayModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-amber-100">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">¿Cerrar Día?</h3>
                <p className="text-slate-600 text-sm mt-1">
                  {format(parseISO(closeDayModal.date), "EEEE, dd 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>

            {closeDayModal.dayInfo && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm">Resumen del Día</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Esperado</p>
                    <p className="text-lg font-bold text-slate-900">
                      S/ {closeDayModal.dayInfo.expectedAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Recaudado</p>
                    <p className="text-lg font-bold text-emerald-600">
                      S/ {closeDayModal.dayInfo.collectedAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Participantes:</span>
                    <span className="font-semibold text-slate-900 ml-1">
                      {closeDayModal.dayInfo.participantCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Transacciones:</span>
                    <span className="font-semibold text-slate-900 ml-1">
                      {closeDayModal.dayInfo.transactionCount}
                    </span>
                  </div>
                </div>

                {closeDayModal.dayInfo.collectedAmount < closeDayModal.dayInfo.expectedAmount && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Faltan S/ {(closeDayModal.dayInfo.expectedAmount - closeDayModal.dayInfo.collectedAmount).toFixed(2)} por recaudar
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
              <p className="text-sm text-rose-800">
                <strong>⚠️ Advertencia:</strong> Al cerrar este día, no se podrán realizar más ediciones simples.
                Solo un administrador podrá reabrirlo.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCloseDayModal(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={confirmCloseDay}
              >
                <Lock className="w-4 h-4 mr-2" />
                Cerrar Día
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reabrir Día */}
      {reopenDayModal && reopenDayModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <Unlock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">¿Reabrir Día?</h3>
                <p className="text-slate-600 text-sm mt-1">
                  {format(parseISO(reopenDayModal.date), "EEEE, dd 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Información:</strong> Al reabrir este día, podrás realizar correcciones y ediciones en los registros.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Advertencia:</strong> Esta es una acción administrativa. Asegúrate de volver a cerrar el día una vez completadas las correcciones.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReopenDayModal(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={confirmReopenDay}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Reabrir Día
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notebook Modal */}
      <NotebookModal isOpen={showNotebook} onClose={() => setShowNotebook(false)} />

      {/* Calculadora flotante FAB */}
      <FloatingCalculator />
    </div>
  );
}

// --- SUB-COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  const styleMap: Record<string, string> = {
    'COMPLETO': 'bg-green-100 text-green-700 border-green-200',
    'PARCIAL': 'bg-amber-100 text-amber-700 border-amber-200',
    'PENDIENTE': 'bg-slate-100 text-slate-600 border-slate-200',
    'VENCIDO': 'bg-red-100 text-red-700 border-red-200',
    'ADELANTADO': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", styleMap[status] || styleMap['PENDIENTE'])}>
      {status}
    </span>
  );
};

interface DayCardProps {
  day: DaySchedule;
  isExpanded: boolean;
  beneficiary?: { name: string; id: string; dailyCommitment: number };
  dailyTotalExpected: number;
  collected: number;
  statusLabel: DayStatus;
  dayTxs: Array<{
    id: string;
    participantId: string;
    amount: number;
    createdAt: string;
    targetDate: string;
    method: string;
    destination: string | null;
    notes: string | null;
  }>;
  junta: JuntaState;
  onExpand: () => void;
  onBeneficiaryChange: (date: string, newId: string) => void;
  onCloseDay: (date: string) => void;
  onReopenDay: (date: string) => void;
  onShowPayModal: (id: string) => void;
}

function DayCard({ day, isExpanded, beneficiary, dailyTotalExpected, collected, statusLabel, dayTxs, junta, onExpand, onBeneficiaryChange, onCloseDay, onReopenDay, onShowPayModal }: DayCardProps) {
  return (
    <div className={cn(
      "rounded-xl border transition-all duration-300 overflow-hidden shadow-sm",
      isExpanded ? "border-indigo-300 ring-1 ring-indigo-100 bg-white" : "border-slate-200 bg-white hover:border-indigo-200"
    )}>
      <div
        className={cn("p-4 flex items-center justify-between cursor-pointer select-none", isExpanded ? "bg-slate-50 border-b border-slate-100" : "")}
        onClick={onExpand}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex flex-col items-center justify-center border font-bold",
            isExpanded ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-700 border-slate-200"
          )}>
            <span className="text-[10px] uppercase leading-none opacity-80">{format(parseISO(day.date), 'MMM', { locale: es })}</span>
            <span className="text-xl leading-none">{format(parseISO(day.date), 'dd')}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{format(parseISO(day.date), 'EEEE', { locale: es })}</span>
              {day.isClosed && <Lock className="w-3 h-3 text-slate-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={statusLabel} />
              <span className="text-xs text-slate-500">
                Recaudado: <b>S/ {collected.toFixed(2)}</b> / {dailyTotalExpected.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold hidden sm:block">Turno de</span>
          <div className="font-medium text-indigo-600 flex items-center justify-end gap-1 text-sm sm:text-base">
            <span className="truncate max-w-[60px] sm:max-w-none">{beneficiary?.name}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 md:p-6 animate-in slide-in-from-top-2 duration-300">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-4 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Meta</span>
              <div className="text-base sm:text-2xl font-mono font-bold text-slate-700">S/ {dailyTotalExpected.toFixed(0)}</div>
            </div>
            <div className="p-2 sm:p-4 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Faltante</span>
              <div className="text-base sm:text-2xl font-mono font-bold text-amber-600">S/ {Math.max(0, dailyTotalExpected - collected).toFixed(0)}</div>
            </div>
            <div className="p-2 sm:p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <span className="text-[10px] sm:text-xs text-indigo-400 font-bold uppercase">Beneficiario</span>
              {day.isClosed ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Lock className="w-4 h-4" /> {beneficiary?.name}
                </div>
              ) : (
                <Select
                  className="mt-1 font-bold text-indigo-800 bg-transparent border-transparent px-0 py-0 h-auto shadow-none focus:ring-0"
                  value={day.beneficiaryId || ''}
                  onChange={(e) => onBeneficiaryChange(day.date, e.target.value)}
                  disabled={day.isClosed}
                >
                  {junta.participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              )}
            </div>
          </div>

          {/* Participant Table */}
          <div className="border rounded-lg overflow-hidden mb-4 sm:mb-6">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-xs">
                <tr>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-left">Nombre</th>
                  <th className="px-1 sm:px-4 py-2 sm:py-3 text-center hidden sm:table-cell">Estado</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right">Aporte</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {junta.participants.map(p => {
                  const pTx = dayTxs.filter(t => t.participantId === p.id);
                  const pPaid = pTx.reduce((acc: number, t) => acc + t.amount, 0);
                  const pStatus = pPaid >= p.dailyCommitment ? 'COMPLETO' : pPaid > 0 ? 'PARCIAL' : 'PENDIENTE';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-1.5 sm:px-4 py-2 sm:py-3 font-medium">
                        <span className="truncate block max-w-[80px] sm:max-w-none">{p.name}</span>
                        {p.id === day.beneficiaryId && <span className="text-[8px] sm:text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded border border-indigo-200">RECIBE</span>}
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-center hidden sm:table-cell">
                        <StatusBadge status={pStatus} />
                      </td>
                      <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-mono text-slate-600">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] sm:text-sm">S/ {pPaid.toFixed(0)}</span>
                          {pPaid < p.dailyCommitment && (
                            <span className="text-[8px] sm:text-[10px] text-red-400">-S/{(p.dailyCommitment - pPaid).toFixed(0)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right">
                        {!day.isClosed && pStatus !== 'COMPLETO' && (
                          <Button size="sm" className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2" onClick={() => onShowPayModal(p.id)}>
                            <Plus className="w-3 h-3" /><span className="hidden sm:inline ml-0.5">Pagar</span>
                          </Button>
                        )}
                        {pStatus === 'COMPLETO' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 ml-auto" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              {day.isClosed ? "Día cerrado." : "Día abierto."}
            </div>
            {!day.isClosed && (
              <Button variant="destructive" size="sm" onClick={() => onCloseDay(day.date)}>
                <Lock className="w-3 h-3 mr-2" /> Cerrar Día
              </Button>
            )}
            {day.isClosed && (
              <Button variant="outline" size="sm" onClick={() => onReopenDay(day.date)}>
                <Unlock className="w-3 h-3 mr-2" /> Reabrir (Admin)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantsSummaryCard({ junta, onViewDetail }: { junta: JuntaState; onViewDetail: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div
        className="bg-white p-4 flex justify-between items-center border-b border-slate-100"
      >
        <div className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          <span>Resumen por Participante</span>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 max-h-[60vh] lg:max-h-[400px] overflow-y-auto">
            {junta.participants.map(p => {
              const myTxs = junta.ledger.filter(t => t.participantId === p.id);
              const totalContributed = myTxs.reduce((acc, t) => acc + t.amount, 0);

              const daysPassed = junta.schedule.filter(d => isBefore(parseISO(d.date), addDays(startOfToday(), 1))).length;
              const debtToDate = p.dailyCommitment * daysPassed;
              const balance = totalContributed - debtToDate;

              const receiveDay = junta.schedule.find(d => d.beneficiaryId === p.id);

              return (
                <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <Badge variant={balance < 0 ? 'destructive' : 'default'}>
                      {balance < 0 ? 'Debiendo' : 'Al día'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
                    <div>
                      <span className="block text-[10px] uppercase">Aportado</span>
                      <span className="font-mono font-medium text-slate-700">S/ {totalContributed.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase">Diferencia</span>
                      <span className={cn("font-mono font-medium", balance < 0 ? "text-red-500" : "text-green-600")}>
                        {Number.isNaN(balance) ? '0.00' : (balance === 0 ? '-' : `${balance > 0 ? '+' : ''}${balance.toFixed(2)}`)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] flex justify-between text-slate-400">
                    <span className={cn("inline-block truncate max-w-[120px]", !receiveDay && "text-amber-500 font-medium")}>
                      {receiveDay ? `Turno: ${format(parseISO(receiveDay.date), 'dd MMM')}` : 'Sin turno asignado'}
                    </span>
                    <span
                      className="cursor-pointer hover:text-indigo-600 flex items-center gap-1"
                      onClick={() => onViewDetail(p.id)}
                    >
                      <Eye className="w-3 h-3" /> Ver detalle
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
    </Card>
  );
}

function KardexModal({ report, loading, error, onClose }: { report: KardexReport | null; loading: boolean; error: string | null; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'kardex' | 'config'>('kardex');
  const defaultFilters = React.useMemo<KardexFilterState>(() => ({ status: 'ALL', method: 'ALL', startDate: '', endDate: '' }), []);
  const [filters, setFilters] = useState<KardexFilterState>(defaultFilters);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const filteredDays = useMemo(() => {
    if (!report) return [];
    return report.days.filter(day => {
      const matchesStatus = filters.status === 'ALL' || day.status === filters.status;
      const matchesMethod = filters.method === 'ALL' || day.transactions.some(tx => tx.method === filters.method);
      const startDate = filters.startDate ? parseISO(filters.startDate) : null;
      const endDate = filters.endDate ? parseISO(filters.endDate) : null;
      const current = parseISO(day.date);
      const matchesStart = startDate ? !isBefore(current, startDate) : true;
      const matchesEnd = endDate ? !isAfter(current, endDate) : true;
      return matchesStatus && matchesMethod && matchesStart && matchesEnd;
    });
  }, [report, filters]);

  const chartData = useMemo(() => {
    // Si hay más de 30 días, simplificar mostrando cada 3 días
    const shouldSimplify = filteredDays.length > 30;
    const step = shouldSimplify ? 3 : 1;
    return filteredDays
      .filter((_, index) => index % step === 0 || index === filteredDays.length - 1)
      .map(day => ({
        date: format(parseISO(day.date), shouldSimplify ? 'dd MMM' : 'dd LLL'),
        balance: day.balanceAfter
      }));
  }, [filteredDays]);

  const totalCollected = useMemo(() => {
    return Math.round(filteredDays.reduce((sum, day) => sum + day.paid, 0) * 100) / 100;
  }, [filteredDays]);

  const stats = report?.stats;

  const handleExportCSV = () => {
    if (!report) return;
    try {
      const rows = report.days.map(day => [
        day.date,
        day.dayNumber.toString(),
        day.expected.toFixed(2),
        day.paid.toFixed(2),
        day.balanceAfter.toFixed(2),
        day.status,
        day.transactions.map(tx => `${tx.method} (${tx.amount.toFixed(2)})`).join('; ')
      ]);
      const csvContent = [
        ['Fecha', 'Día', 'Cuota', 'Pagado', 'Balance', 'Estado', 'Transacciones'],
        ...rows
      ]
        .map(row => row.map(col => `"${col.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${report.participantName}-kardex.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExportFeedback('✓ CSV descargado');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (error) {
      console.error("Error exportando CSV kardex:", error);
      setExportFeedback('✗ Error al exportar');
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    try {
      const doc = new jsPDF('portrait', 'pt', 'a4');
      doc.setFontSize(16);
      doc.text(`${report.participantName} - Kardex`, 40, 40);
      autoTable(doc, {
        startY: 60,
        head: [['Fecha', 'Día', 'Cuota', 'Pagado', 'Balance', 'Estado']],
        body: report.days.map(day => [
          day.date,
          day.dayNumber.toString(),
          day.expected.toFixed(2),
          day.paid.toFixed(2),
          day.balanceAfter.toFixed(2),
          day.status
        ]),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 }
      });
      doc.save(`${report.participantName}-kardex.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      setExportFeedback('✗ Error al exportar');
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  if (!report && !loading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden relative my-4">
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
          <div>
            <p className="text-[10px] uppercase text-slate-400 tracking-wider">Kardex Administrativo</p>
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              {report?.participantName ?? 'Cargando...'}
            </h3>
            {stats && (
              <p className="text-xs text-slate-500">Cumplimiento al {stats.complianceRate}% • Deuda actual: S/. {stats.globalDebt.toFixed(2)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2 rounded-lg sm:rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50">
          <div className="rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase">Deuda total</p>
            <p className="text-base sm:text-lg font-bold text-rose-600">S/. {stats?.globalDebt.toFixed(2) ?? '0.00'}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase">Total aportado</p>
            <p className="text-base sm:text-lg font-bold text-slate-900">S/. {stats?.totalPaid.toFixed(2) ?? '0.00'}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase">Cumplimiento</p>
            <p className="text-base sm:text-lg font-bold text-indigo-600">{stats?.complianceRate ?? 0}%</p>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-slate-500">Cargando...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-rose-100 p-3 mb-3">
                <X className="w-6 h-6 text-rose-600" />
              </div>
              <p className="text-rose-600 font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
                Cerrar
              </Button>
            </div>
          )}

          {!loading && !error && report && (
            <>
              <div className="flex gap-1 sm:gap-2 border-b border-slate-200 text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide overflow-x-auto">
                <button
                  className={cn('py-2 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2', activeTab === 'kardex' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400')}
                  onClick={() => setActiveTab('kardex')}
                >
                  <FileText className="w-4 h-4" /> Historial
                </button>
                <button
                  className={cn('py-2 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2', activeTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400')}
                  onClick={() => setActiveTab('config')}
                >
                  <Settings className="w-4 h-4" /> Configuración
                </button>
              </div>

              <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-6">
                {activeTab === 'kardex' && (
                  <>
                    {chartData.length > 0 ? (
                      <div className="w-full h-40 sm:h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                            />
                            <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'Línea de balance 0', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                            <Line type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="w-full h-40 sm:h-48 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm font-medium">Sin datos para mostrar</p>
                          <p className="text-slate-400 text-xs">Ajusta los filtros para ver resultados</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-1 w-full">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Estado</label>
                          <Select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as KardexFilterState['status'] }))}>
                            <option value="ALL">Todos</option>
                            <option value="COMPLETED">Completos</option>
                            <option value="PARTIAL">Parciales</option>
                            <option value="MISSING">Pendientes</option>
                            <option value="FUTURE">Futuros</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Método</label>
                          <Select value={filters.method} onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value as KardexFilterState['method'] }))}>
                            <option value="ALL">Todos</option>
                            <option value="CASH">Efectivo</option>
                            <option value="YAPE">Yape</option>
                            <option value="DEBIT">Débito</option>
                            <option value="CREDIT_BCP">Crédito BCP</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Desde</label>
                          <Input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Hasta</label>
                          <Input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters(defaultFilters)}
                        className="whitespace-nowrap w-full sm:w-auto"
                        title="Limpiar filtros"
                      >
                        <RotateCcw className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Limpiar</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-start sm:items-center justify-between">
                      <div className="text-xs sm:text-sm text-slate-500">
                        {filteredDays.length} registros • S/. {totalCollected.toFixed(2)} recaudados
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto items-center">
                        {exportFeedback && (
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded",
                            exportFeedback.includes('✓') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {exportFeedback}
                          </span>
                        )}
                        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!report || loading} className="flex-1 sm:flex-none">
                          <Download className="w-4 h-4" /><span className="hidden sm:inline ml-1">CSV</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!report || loading} className="flex-1 sm:flex-none">
                          <FileText className="w-4 h-4" /><span className="hidden sm:inline ml-1">PDF</span>
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] sm:text-xs uppercase">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 sm:py-3">Fecha</th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Cuota</th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Pagado</th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Balance</th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Estado</th>
                              <th className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Detalle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredDays.map(day => {
                              const statusLabels: Record<string, string> = {
                                'COMPLETED': 'Completo',
                                'PARTIAL': 'Parcial',
                                'MISSING': 'Falta',
                                'FUTURE': 'Futuro'
                              };
                              const hasDebt = day.balanceAfter < 0;
                              return (
                                <tr key={day.date} className={cn(
                                  "hover:bg-slate-50 transition-colors",
                                  hasDebt && "bg-rose-50 hover:bg-rose-100 border-l-4 border-rose-400"
                                )}>
                                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-slate-700 whitespace-nowrap">{format(parseISO(day.date), 'dd MMM')}</td>
                                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-500">{day.expected.toFixed(0)}</td>
                                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-slate-700">{day.paid > 0 ? day.paid.toFixed(0) : '-'}</td>
                                  <td className={cn(
                                    "px-2 sm:px-4 py-2 sm:py-3 text-right font-mono font-semibold",
                                    hasDebt ? "text-rose-600" : "text-emerald-600"
                                  )}>{day.balanceAfter.toFixed(0)}</td>
                                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                    <Badge
                                      variant={day.status === 'COMPLETED' ? 'default' : day.status === 'MISSING' ? 'destructive' : 'outline'}
                                      className="text-[9px] sm:text-[10px] uppercase px-1 sm:px-2 py-0.5 sm:py-1"
                                    >
                                      {statusLabels[day.status] || day.status}
                                    </Badge>
                                  </td>
                                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs text-slate-500 hidden md:table-cell">
                                    {day.transactions.length > 0 ? (
                                      <div className="space-y-1">
                                        {day.transactions.map(tx => (
                                          <div key={tx.id} className="flex flex-col mb-2 last:mb-0 border-b pb-1 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono">{tx.paidAt.split('T')[0]}</span>
                                              <span>•</span>
                                              <span>{tx.method}</span>
                                              {tx.destination && <span>• {tx.destination}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                              {tx.clientTxId && (
                                                <span title={`Idempotency ID: ${tx.clientTxId}`} className="text-slate-400 font-mono">id:{tx.clientTxId.slice(0, 6)}</span>
                                              )}
                                              {tx.cajaTransactionId ? (
                                                <span className="text-emerald-500 font-bold" title="Caja Integrada (Synced)">[✓ CAJA]</span>
                                              ) : (
                                                <span className="text-slate-400" title="Sin Asentar en Caja">[✗ ASENT]</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">Sin movimientos</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredDays.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No hay registros para los filtros activos.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'config' && report && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 space-y-2 sm:space-y-3 shadow-sm">
                      <p className="text-[10px] sm:text-xs uppercase text-slate-400 font-semibold">Datos del participante</p>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Nombre</p>
                        <p className="text-sm sm:text-base font-semibold text-slate-800">{report.participantName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Días analizados</p>
                        <p className="text-sm sm:text-base font-semibold text-slate-800">{report.days.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Próximo turno</p>
                        <p className="text-sm sm:text-base font-semibold text-slate-800">{stats?.nextTurnDate ?? 'Sin asignar'}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 space-y-2 sm:space-y-3 shadow-sm">
                      <p className="text-[10px] sm:text-xs uppercase text-slate-400 font-semibold">Operaciones administrativas</p>
                      <Button variant="outline" className="w-full flex items-center gap-2 justify-center text-xs sm:text-sm text-xs sm:text-sm" size="sm">
                        <Download className="w-3 sm:w-4 h-3 sm:h-4" /> Exportar reporte offline
                      </Button>
                      <Button variant="outline" className="w-full flex items-center gap-2 justify-center text-xs sm:text-sm" size="sm">
                        <AlertTriangle className="w-3 sm:w-4 h-3 sm:h-4" /> Dar de baja (retirar)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Botón de cerrar inferior para mejor accesibilidad móvil */}
        {!loading && !error && (
          <div className="sticky bottom-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-t from-white via-white to-transparent border-t border-slate-200">
            <Button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg"
              size="lg"
            >
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type KardexFilterState = {
  status: KardexDay['status'] | 'ALL';
  method: PaymentMethod | 'ALL';
  startDate: string;
  endDate: string;
};

interface TransactionModalProps {
  participant: { id: string; name: string; dailyCommitment: number };
  targetDate: string;
  remainingDebt: number;
  onClose: () => void;
  onSave: (txData: TransactionInput) => Promise<void>;
}

function TransactionModal({ participant, targetDate, remainingDebt, onClose, onSave }: TransactionModalProps) {
  const [amount, setAmount] = useState(remainingDebt > 0 ? remainingDebt : participant.dailyCommitment);
  const [method, setMethod] = useState<'CASH' | 'YAPE' | 'DEBIT' | 'CREDIT_BCP'>('CASH');
  const [destination, setDestination] = useState<CuentaDestino | null>(CuentaDestino.EFECTIVO);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave({
        targetDate,
        participantId: participant.id,
        amount: Number(amount),
        method,
        destination,
        notes: notes || undefined
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error al guardar la transacción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h3 className="font-bold text-lg">Registrar Aporte</h3>
            <p className="text-indigo-200 text-xs mt-0.5">ADMIN MODE • {participant.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl" disabled={isSubmitting}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Monto (S/)</label>
            <div className="relative">
              <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                step="0.10"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="pl-9 text-lg font-bold"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-slate-500 text-right">Pendiente: S/ {Math.max(0, remainingDebt).toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Método</label>
              <Select value={method} onChange={e => setMethod(e.target.value as 'CASH' | 'YAPE' | 'DEBIT' | 'CREDIT_BCP')} disabled={isSubmitting}>
                <option value="CASH">Efectivo</option>
                <option value="YAPE">Yape</option>
                <option value="DEBIT">Débito</option>
                <option value="CREDIT_BCP">Crédito BCP</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Destino</label>
              <Select value={destination || ''} onChange={e => setDestination(e.target.value as CuentaDestino)} disabled={isSubmitting}>
                <option value={CuentaDestino.EFECTIVO}>Efectivo / Caja chica</option>
                <option value={CuentaDestino.YAPE_PILAR}>Yape Pilar</option>
                <option value={CuentaDestino.YAPE_SEBASTIAN}>Yape Sebastian</option>
                <option value={CuentaDestino.YAPE_STHEFANY}>Yape Sthefany</option>
                <option value={CuentaDestino.TRANSFERENCIA_SEBASTIAN}>Transferencia Sebastian</option>
                <option value={CuentaDestino.TRANSFERENCIA_STHEFANY}>Transferencia Sthefany</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nota / Observación</label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Pago parcial..."
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ junta, onClose }: { junta: JuntaState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5" /> Historial de Transacciones
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {[...junta.ledger]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(tx => {
              const pName = junta.participants.find(p => p.id === tx.participantId)?.name;
              return (
                <div key={tx.id} className="p-3 border rounded text-sm flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {pName} <span className="text-slate-400 font-normal">pagó para el</span> {format(parseISO(tx.targetDate), 'dd/MM')}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                      <span>{format(parseISO(tx.createdAt), 'dd MMM HH:mm')}</span>
                      <span>•</span>
                      <span>{tx.method}</span>
                      {tx.destination && (
                        <>
                          <span>•</span>
                          <span>{tx.destination}</span>
                        </>
                      )}
                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span>Nota: {tx.notes}</span>
                        </>
                      )}
                      {tx.clientTxId && (
                        <>
                          <span>•</span>
                          <span title={`Offline/Idempotency ID: ${tx.clientTxId}`} className="text-slate-300 font-mono text-[9px] truncate max-w-[80px]">tx:{tx.clientTxId.slice(0, 6)}</span>
                        </>
                      )}
                      <>
                        <span>•</span>
                        {tx.cajaTransactionId ? (
                          <span className="text-emerald-500 font-bold" title="Caja Integrada (Synced)">[✓ CAJA]</span>
                        ) : (
                          <span className="text-slate-400" title="Sin Asentar en Caja">[✗ ASENT]</span>
                        )}
                      </>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-indigo-600">S/ {tx.amount.toFixed(2)}</div>
                </div>
              );
            })}
          {junta.ledger.length === 0 && (
            <div className="text-center py-8 text-slate-400">No hay movimientos registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: VISTA DE JUNTAS ARCHIVADAS
// ============================================

function ArchivedJuntasView({ juntas }: { juntas: ArchivedJuntaSummary[] }) {
  const [selectedReport, setSelectedReport] = useState<JuntaFinalReport | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewReport = async (juntaId: string) => {
    setIsLoading(true);
    try {
      const report = await getJuntaArchiveReport(juntaId);
      if (report) {
        setSelectedReport(report);
        setIsReportOpen(true);
      } else {
        alert("❌ No se pudo cargar el reporte");
      }
    } catch (error) {
      console.error("Error cargando reporte archivado:", error);
      alert("❌ Error al cargar el reporte");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (juntaId: string, juntaName: string) => {
    const newName = prompt("📝 Nombre de la nueva junta:", juntaName + " (Copia)");
    if (!newName) return;

    const startDateStr = prompt("📅 Fecha de inicio (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!startDateStr) return;

    try {
      const result = await duplicateJunta(juntaId, newName, new Date(startDateStr));
      if (result.success) {
        alert("✅ Junta duplicada exitosamente");
        window.location.reload();
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (error) {
      console.error("Error duplicando junta:", error);
      alert("❌ Error al duplicar la junta");
    }
  };

  const handleExportCSV = (report: JuntaFinalReport) => {
    const rows = [
      ['Reporte de Junta Archivada'],
      ['Nombre:', report.juntaName],
      ['Período:', `${report.period.start} a ${report.period.end}`],
      ['Total Días:', report.period.totalDays],
      [''],
      ['Participante', 'Compromiso Diario', 'Total Pagado', 'Total Esperado', 'Cumplimiento %', 'Deuda Final'],
      ...report.participants.map(p => [
        p.name,
        p.dailyCommitment,
        p.totalPaid,
        p.totalExpected,
        p.complianceRate.toFixed(1),
        p.finalDebt
      ]),
      [''],
      ['TOTALES'],
      ['Total Recaudado:', report.globalStats.totalCollected],
      ['Total Esperado:', report.globalStats.totalExpected],
      ['Cumplimiento Global:', report.globalStats.globalCompliance.toFixed(1) + '%'],
      ['Deuda Total:', report.globalStats.totalDebt]
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-${report.juntaName.replace(/\s+/g, '-')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderArchive className="h-5 w-5 text-indigo-600" />
            Juntas Archivadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {juntas.length === 0 ? (
            <div className="text-center py-12">
              <FolderArchive className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No hay juntas archivadas</p>
              <p className="text-slate-400 text-sm mt-2">Las juntas archivadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-center">Participantes</th>
                    <th className="px-4 py-3 text-right">Recaudado</th>
                    <th className="px-4 py-3 text-center">Cumplimiento</th>
                    <th className="px-4 py-3 text-left">Archivado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {juntas.map(junta => (
                    <tr key={junta.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{junta.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {format(parseISO(junta.startDate), 'dd MMM yyyy', { locale: es })} - {format(parseISO(junta.endDate), 'dd MMM yyyy', { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{junta.participantCount}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                        S/ {junta.totalCollected.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={junta.complianceRate >= 90 ? 'default' : junta.complianceRate >= 70 ? 'outline' : 'destructive'}>
                          {junta.complianceRate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(parseISO(junta.archivedAt), 'dd MMM yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReport(junta.id)}
                            disabled={isLoading}
                            title="Ver reporte completo"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(junta.id, junta.name)}
                            title="Duplicar junta"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Reporte Detallado */}
      {isReportOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setIsReportOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedReport.juntaName}</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  {format(parseISO(selectedReport.period.start), 'dd MMM yyyy', { locale: es })} - {format(parseISO(selectedReport.period.end), 'dd MMM yyyy', { locale: es })} ({selectedReport.period.totalDays} días)
                </p>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Estadísticas Globales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Total Recaudado</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">S/ {selectedReport.globalStats.totalCollected.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Total Esperado</p>
                    <p className="text-2xl font-bold text-slate-700 mt-1">S/ {selectedReport.globalStats.totalExpected.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Cumplimiento</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{selectedReport.globalStats.globalCompliance.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Diferencia</p>
                    <p className={`text-2xl font-bold mt-1 ${selectedReport.globalStats.totalDebt >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      S/ {selectedReport.globalStats.totalDebt.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de Participantes */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Desempeño por Participante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Participante</th>
                          <th className="px-4 py-2 text-right">Compromiso/Día</th>
                          <th className="px-4 py-2 text-right">Pagado</th>
                          <th className="px-4 py-2 text-right">Esperado</th>
                          <th className="px-4 py-2 text-center">Cumplimiento</th>
                          <th className="px-4 py-2 text-right">Deuda</th>
                          <th className="px-4 py-2 text-center">Turnos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedReport.participants.map(p => (
                          <tr key={p.id} className={p.finalDebt < 0 ? 'bg-rose-50' : ''}>
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-right font-mono">S/ {p.dailyCommitment.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600">S/ {p.totalPaid.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">S/ {p.totalExpected.toFixed(0)}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={p.complianceRate >= 90 ? 'default' : p.complianceRate >= 70 ? 'outline' : 'destructive'}>
                                {p.complianceRate.toFixed(0)}%
                              </Badge>
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-semibold ${p.finalDebt >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              S/ {p.finalDebt.toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500">
                              {p.turnsReceived.length > 0 ? p.turnsReceived.join(', ') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Línea de Tiempo */}
              {selectedReport.timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Línea de Tiempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedReport.timeline.slice(0, 10).map((event, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="text-xs text-slate-400 font-mono w-24 flex-shrink-0">
                            {format(parseISO(event.date), 'dd MMM yyyy', { locale: es })}
                          </div>
                          <div className="text-sm text-slate-600">{event.event}</div>
                        </div>
                      ))}
                      {selectedReport.timeline.length > 10 && (
                        <p className="text-xs text-slate-400 italic mt-2">
                          ... y {selectedReport.timeline.length - 10} eventos más
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Footer con botones */}
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t">
              <Button variant="outline" size="sm" onClick={() => handleExportCSV(selectedReport)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="default" size="sm" onClick={() => setIsReportOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}