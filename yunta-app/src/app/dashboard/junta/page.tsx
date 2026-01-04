'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    format, addDays, differenceInDays, startOfDay, isSameDay, parseISO, isAfter, isBefore, startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Users, Calendar, History, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
    Banknote, Smartphone, ArrowRightLeft, LayoutDashboard, Settings, X, Lock, Unlock,
    UserCircle2, PieChart, Save, AlertTriangle, FileText, TrendingUp, Phone, MoreVertical,
    Download, Plus, Trash2, Wand2, ArrowRight, Loader2, Wallet, Shield
} from 'lucide-react';

// --- SERVER ACTIONS ---
import { createJunta, getActiveJunta, recordPayment, closeDay, rescheduleTurn, JuntaState } from '@/app/actions/junta';
import { generateGeminiResponse } from '@/app/actions/ai';

// --- UI HELPERS ---

const formatDate = (dateString: string, includeYear = false) => {
    if (!dateString) return '-';
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    if (includeYear) options.year = 'numeric';
    return date.toLocaleDateString('es-ES', options);
};

const getDayNumber = (startDateStr: string, currentDateStr: string) => {
    const start = new Date(startDateStr);
    const current = new Date(currentDateStr);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
};

// --- COMPONENTS ---

const Card = ({ children, className = "", onClick }: any) => (
    <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className} ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}>
        {children}
    </div>
);

const Badge = ({ children, color = "slate", className = "" }: any) => {
    const colors: any = {
        slate: "bg-slate-100 text-slate-700",
        emerald: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-800",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colors[color] || colors.slate} ${className}`}>
            {children}
        </span>
    );
};

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

type ConfigFormValues = z.infer<typeof configSchema>;
const generateUUID = () => crypto.randomUUID();

export default function JuntaPage() {
    const [view, setView] = useState<'CONFIG' | 'DASHBOARD' | 'LOADING'>('LOADING');
    const [junta, setJunta] = useState<JuntaState | null>(null);

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

    const handleJuntaCreated = async (newState: JuntaState) => {
        setView('LOADING');
        const res = await createJunta(newState);
        if (res.success) {
            setJunta(newState);
            setView('DASHBOARD');
        } else {
            alert("Error al guardar: " + res.error);
            setView('CONFIG');
        }
    };

    const refreshJunta = async () => {
        const active = await getActiveJunta();
        if (active) setJunta(active);
    };

    if (view === 'LOADING') return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
    if (view === 'CONFIG') return <ConfigWizard onComplete={handleJuntaCreated} />;

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-24 max-w-lg mx-auto border-x border-slate-200 shadow-2xl relative">
            <JuntaDashboard junta={junta!} onUpdate={refreshJunta} />
        </div>
    );
}

function JuntaDashboard({ junta, onUpdate }: { junta: JuntaState, onUpdate: () => void }) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'turns' | 'history'>('dashboard');
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [modals, setModals] = useState({
        payment: false,
        participantDetail: false,
        turnEdit: false,
        dayClose: false
    });

    const [selectedItem, setSelectedItem] = useState<any>(null);

    const dailyStatus = useMemo(() => {
        return junta.participants.map(p => {
            const dayTxs = junta.ledger.filter(t => t.participantId === p.id && t.targetDate === currentDate);
            const paidAmount = dayTxs.reduce((sum, t) => sum + t.amount, 0);
            const pending = p.dailyCommitment - paidAmount;
            let status = 'PENDING';
            if (paidAmount >= p.dailyCommitment) status = 'COMPLETED';
            else if (paidAmount > 0) status = 'PARTIAL';
            return { ...p, paidAmount, pending, status, transactions: dayTxs };
        });
    }, [junta.ledger, currentDate, junta.participants]);

    const dayTotals = useMemo(() => {
        const expected = dailyStatus.reduce((sum, p) => sum + p.dailyCommitment, 0);
        const collected = dailyStatus.reduce((sum, p) => sum + p.paidAmount, 0);
        const pending = expected - collected;
        const byMethod: Record<string, number> = {};
        junta.ledger.filter(t => t.targetDate === currentDate).forEach(t => { byMethod[t.method] = (byMethod[t.method] || 0) + t.amount; });
        return { expected, collected, pending, byMethod };
    }, [dailyStatus, currentDate, junta.ledger]);

    const handleRegisterPayment = async (paymentData: any) => {
        const res = await recordPayment(junta.id, {
            targetDate: currentDate,
            participantId: paymentData.participantId,
            amount: paymentData.amount,
            method: paymentData.method,
            destination: paymentData.destinationId,
            notes: ''
        });
        if (res.success) {
            onUpdate();
            setModals({ ...modals, payment: false });
        } else {
            alert("Error al registrar pago: " + res.error);
        }
    };

    const handleDayChange = (offset: number) => {
        const date = new Date(currentDate + 'T12:00:00');
        date.setDate(date.getDate() + offset);
        setCurrentDate(format(date, 'yyyy-MM-dd'));
    };

    const DashboardView = () => (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm sticky top-[60px] z-10 transition-all">
                <button onClick={() => handleDayChange(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft size={20} /></button>
                <div className="text-center">
                    <h2 className="font-bold text-slate-800 text-sm">{formatDate(currentDate)}</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Día {getDayNumber(junta.dateRange.from, currentDate)}</p>
                </div>
                <button onClick={() => handleDayChange(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight size={20} /></button>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><PieChart size={100} /></div>
                <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Recaudación del Día</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm text-slate-400 font-bold mb-4 mr-1">S/.</span>
                        <h2 className="text-5xl font-bold tracking-tight">{dayTotals.collected.toFixed(0)}</h2>
                        <span className="text-2xl text-slate-400">.{dayTotals.collected.toFixed(2).split('.')[1]}</span>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <div className="bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded-lg flex-1">
                            <span className="text-[10px] text-slate-400 block uppercase">Esperado</span>
                            <span className="font-bold text-sm">S/. {dayTotals.expected}</span>
                        </div>
                        <div className="bg-rose-900/40 backdrop-blur-sm px-3 py-2 rounded-lg flex-1 border border-rose-500/30">
                            <span className="text-[10px] text-rose-300 block uppercase">Falta</span>
                            <span className="font-bold text-sm text-rose-200">S/. {dayTotals.pending.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={() => setModals({ ...modals, dayClose: true })} className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 active:bg-slate-50">
                <Lock size={16} className="text-slate-400" /> Cerrar Caja
            </button>

            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Participantes</h3>
                <div className="space-y-3">
                    {dailyStatus.map((p) => (
                        <Card key={p.id} className={`overflow-hidden transition-all ${p.status === 'COMPLETED' ? 'opacity-90' : 'opacity-100'}`}>
                            <div className="p-4 flex items-center justify-between">
                                <div onClick={() => { setSelectedItem(p); setModals({ ...modals, participantDetail: true }); }} className="flex items-center gap-3 flex-1 cursor-pointer group">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm relative overflow-hidden transition-transform group-active:scale-95 ${p.status === 'COMPLETED' ? 'bg-emerald-500' : p.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                        {p.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-slate-800 truncate">{p.name}</span>
                                            {p.status === 'COMPLETED' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-500">Meta: {p.dailyCommitment}</span>
                                            {p.pending > 0 && <span className="font-bold text-rose-500">Debe: {p.pending.toFixed(2)}</span>}
                                        </div>
                                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${p.status === 'COMPLETED' ? 'bg-emerald-500' : p.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${(p.paidAmount / p.dailyCommitment) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-3 pl-3 border-l border-slate-100">
                                    {p.status !== 'COMPLETED' ? (
                                        <button onClick={() => { setSelectedItem(p); setModals({ ...modals, payment: true }); }} className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow hover:bg-slate-700 active:scale-90 transition-all">
                                            <Banknote size={18} />
                                        </button>
                                    ) : (
                                        <div className="w-10 h-10 flex items-center justify-center text-emerald-200"><CheckCircle2 size={24} /></div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );

    const TurnsView = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold mb-1">Calendario</h2>
                <p className="text-blue-100 text-sm">Próximos turnos de cobro.</p>
            </div>
            <div className="flex flex-col gap-3">
                {junta.schedule.map((day) => {
                    const date = parseISO(day.date);
                    const isToday = day.date === currentDate;
                    const user = junta.participants.find(p => p.id === day.beneficiaryId);

                    return (
                        <div key={day.date} onClick={() => { setSelectedItem(day.date); setModals({ ...modals, turnEdit: true }); }} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer active:scale-95 transition-transform ${isToday ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100' : 'bg-white border-slate-100'}`}>
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-[10px] font-bold uppercase text-slate-400">{format(date, 'MMM')}</span>
                                <span className="text-lg font-bold text-slate-700">{format(date, 'dd')}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-slate-800">{user?.name || "Sin Asignar"}</p>
                                    {day.isClosed && <Lock size={12} className="text-slate-400" />}
                                </div>
                                <p className="text-xs text-slate-400">Turno de Cobro</p>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const HistoryView = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <h2 className="font-bold text-xl text-slate-800 px-2">Historial Completo</h2>
            {[...junta.ledger].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(tx => {
                const user = junta.participants.find(p => p.id === tx.participantId);
                return (
                    <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${tx.method === 'CASH' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}>
                                <Banknote size={16} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 text-sm">{user?.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                                    {formatDate(tx.targetDate)} • {tx.method}
                                </p>
                            </div>
                        </div>
                        <span className="font-mono font-bold text-slate-800">+S/.{tx.amount}</span>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            <header className="bg-white/80 backdrop-blur-md px-4 py-3 sticky top-0 z-20 border-b border-slate-100 flex justify-between items-center h-[56px]">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">J</div>
                    <div><h1 className="font-bold text-slate-800 text-sm leading-tight">Yunta V2</h1><p className="text-[10px] text-slate-400 font-medium">Dashboard Familiar</p></div>
                </div>
                <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><History size={18} /></button>
            </header>

            <main className="p-4">
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'turns' && <TurnsView />}
                {activeTab === 'history' && <HistoryView />}
            </main>

            <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-slate-200 flex justify-around py-3 px-2 z-20 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] left-0 right-0 mx-auto">
                <NavBtn icon={LayoutDashboard} label="Control" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavBtn icon={Calendar} label="Turnos" active={activeTab === 'turns'} onClick={() => setActiveTab('turns')} />
                <NavBtn icon={History} label="Historial" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </nav>

            {/* MODALS */}
            <PaymentModal isOpen={modals.payment} onClose={() => setModals({ ...modals, payment: false })} selectedParticipant={selectedItem} pendingAmount={selectedItem ? (selectedItem.dailyCommitment - selectedItem.paidAmount) : 0} onConfirm={handleRegisterPayment} />

            {modals.dayClose && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-slate-900 p-6 text-white text-center">
                            <Lock className="mx-auto mb-2 opacity-80" size={32} />
                            <h3 className="text-xl font-bold">Cierre de Caja</h3>
                            <p className="text-slate-400 text-sm">{formatDate(currentDate)}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 text-center">
                                Total Recaudado: <b>S/. {dayTotals.collected.toFixed(2)}</b><br />
                                {dayTotals.pending > 0 && <span className="text-rose-500">Pendiente: S/. {dayTotals.pending.toFixed(2)}</span>}
                            </p>
                            <button onClick={async () => {
                                if (confirm("¿Confirmar cierre?")) {
                                    const res = await closeDay(junta.id, currentDate);
                                    if (res.success) { onUpdate(); setModals({ ...modals, dayClose: false }); }
                                    else alert(res.error);
                                }
                            }} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800">Cerrar Caja</button>
                            <button onClick={() => setModals({ ...modals, dayClose: false })} className="w-full text-slate-500 py-2">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {modals.turnEdit && selectedItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Asignar Turno</h3><button onClick={() => setModals({ ...modals, turnEdit: false })}><X size={20} /></button></div>
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                            {junta.participants.map(p => (
                                <button key={p.id} onClick={async () => {
                                    const res = await rescheduleTurn(junta.id, selectedItem, p.id);
                                    if (res.success) { onUpdate(); setModals({ ...modals, turnEdit: false }); }
                                    else alert(res.error);
                                }} className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-600">{p.name.charAt(0)}</div>
                                    <span className="font-medium">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}>
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

function PaymentModal({ isOpen, onClose, selectedParticipant, pendingAmount, onConfirm }: any) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'CASH' | 'YAPE'>('CASH');
    const [destination, setDestination] = useState('CAJA_CHICA');

    useEffect(() => { if (isOpen) setAmount(pendingAmount > 0 ? pendingAmount.toString() : ''); }, [isOpen, pendingAmount]);
    if (!isOpen || !selectedParticipant) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white"><div><h3 className="font-semibold text-lg">Registrar Pago</h3></div><button onClick={onClose}><X size={20} /></button></div>
                <div className="p-6 space-y-6">
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex justify-between items-center"><span className="text-rose-700 font-medium">Deuda:</span><span className="text-rose-700 font-bold text-xl">S/. {pendingAmount.toFixed(2)}</span></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Monto</label><input type="number" autoFocus className="w-full p-3 text-2xl font-bold border rounded-lg" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Método</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setMethod('CASH')} className={`p-3 border rounded-lg ${method === 'CASH' ? 'bg-emerald-50 border-emerald-500' : ''}`}>Efectivo</button>
                            <button onClick={() => setMethod('YAPE')} className={`p-3 border rounded-lg ${method === 'YAPE' ? 'bg-purple-50 border-purple-500' : ''}`}>Digital</button>
                        </div>
                    </div>
                    <button disabled={!amount || parseFloat(amount) <= 0} onClick={() => onConfirm({ participantId: selectedParticipant.id, amount: parseFloat(amount), method, destinationId: destination })} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50">Confirmar</button>
                </div>
            </div>
        </div>
    );
}

import { Resolver } from 'react-hook-form'; // Add import if not present, but I'll strictly replace the line in ConfigWizard
// Wait, I need to make sure Resolver is imported. It is imported in 'react-hook-form' usually.
// Actually, simple cast to 'any' is safer given I can't check imports easily without modifying top.
// I will just cast `zodResolver(configSchema) as any`.

function ConfigWizard({ onComplete }: { onComplete: (state: JuntaState) => void }) {
    const [step, setStep] = useState(1);
    const [tempConfig, setTempConfig] = useState<ConfigFormValues | null>(null);
    const form = useForm<ConfigFormValues>({
        resolver: zodResolver(configSchema) as any,
        defaultValues: { participants: [{ id: generateUUID(), name: '', dailyCommitment: 0 }, { id: generateUUID(), name: '', dailyCommitment: 0 }], dateRange: { from: new Date(), to: addDays(new Date(), 9) } }
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'participants' });
    const onStep1Submit = (data: ConfigFormValues) => { setTempConfig(data); setStep(2); };

    if (step === 2 && tempConfig) return <ScheduleBuilder config={tempConfig} onBack={() => setStep(1)} onComplete={onComplete} />;

    return (
        <Card className="animate-in fade-in max-w-4xl mx-auto m-6">
            <div className="p-6 border-b bg-slate-50/50 rounded-t-xl"><h2 className="text-lg font-semibold flex items-center gap-2">Configuración Inicial</h2></div>
            <form onSubmit={form.handleSubmit(onStep1Submit)} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-sm font-medium">Inicio</label><Controller control={form.control} name="dateRange.from" render={({ field }) => (<div className="p-2 border rounded">{format(field.value, 'yyyy-MM-dd')}</div>)} /></div></div>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-left"><tr><th className="p-3">Nombre</th><th className="p-3">Aporte Diario (S/)</th><th className="p-3"></th></tr></thead>
                        <tbody className="divide-y">{fields.map((f, i) => (<tr key={f.id}><td className="p-2"><input className="w-full border p-1 rounded" {...form.register(`participants.${i}.name`)} placeholder="Nombre..." /></td><td className="p-2"><input className="w-full border p-1 rounded" type="number" step="0.5" {...form.register(`participants.${i}.dailyCommitment`)} /></td><td className="p-2"><button type="button" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" /></button></td></tr>))}</tbody>
                    </table>
                </div>
                <div className="flex justify-between"><button type="button" className="text-sm flex items-center" onClick={() => append({ id: generateUUID(), name: '', dailyCommitment: 0 })}><Plus className="w-4 h-4 mr-2" />Socio</button><button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded">Siguiente</button></div>
            </form>
        </Card>
    );
}

function ScheduleBuilder({ config, onBack, onComplete }: any) {
    const [schedule, setSchedule] = useState<{ date: string; beneficiaryId: string | null; isClosed: boolean }[]>(() => { const days = differenceInDays(config.dateRange.to, config.dateRange.from) + 1; return Array.from({ length: days }, (_, i) => ({ date: format(addDays(config.dateRange.from, i), 'yyyy-MM-dd'), beneficiaryId: null, isClosed: false })); });
    const handleFinish = () => { onComplete({ id: generateUUID(), status: 'ACTIVE', participants: config.participants, dateRange: { from: config.dateRange.from.toISOString(), to: config.dateRange.to.toISOString() }, schedule, ledger: [] }); };

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Asignar Turnos</h2>
            <div className="space-y-2 mb-4">
                {schedule.map((day: any, idx: number) => (
                    <div key={day.date} className="flex gap-2">
                        <span className="w-24">{day.date}</span>
                        <select className="border rounded px-2" value={day.beneficiaryId || ''} onChange={e => { const newSched = [...schedule]; newSched[idx].beneficiaryId = e.target.value; setSchedule(newSched); }}>
                            <option value="">Elegir...</option>
                            {config.participants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                ))}
            </div>
            <button onClick={handleFinish} className="bg-green-600 text-white py-2 px-4 rounded w-full">Finalizar Configuración</button>
        </div>
    )
}
