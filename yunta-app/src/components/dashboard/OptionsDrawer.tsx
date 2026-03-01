'use client';

import React, { useState } from 'react';
import { X, Settings, Download, Database, Trash2, Palette, Bell } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useTheme } from '@/hooks/useTheme';
import NotificationsModal from './modals/NotificationsModal';

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string | null;
  transactions: Array<{
    id: string;
    amount: number | string;
    type: 'IN' | 'OUT';
    description: string;
    category?: string;
    date: string;
    method?: string;
    user?: { name: string };
  }>;
  onExportCSV: () => void;
}

export default function OptionsDrawer({
  isOpen,
  onClose,
  userRole,
  transactions,
  onExportCSV,
}: OptionsDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const handleExport = () => {
    onExportCSV();
    setSuccessText('Datos exportados correctamente');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleDeleteConfirm = () => {
    try {
      // Clear all localStorage data
      const keysToDelete = [
        'yunta-user-id',
        'yunta-user-name',
        'yunta-user-role',
        'yunta-savings-goals',
        'yunta-theme',
        'yunta-notifications-enabled',
        'yunta-notifications-prefs',
      ];
      
      keysToDelete.forEach((key) => {
        localStorage.removeItem(key);
      });

      setShowDeleteConfirm(false);
      setSuccessText('Datos eliminados correctamente');
      setShowSuccessMessage(true);
      
      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error deleting data:', error);
      setShowDeleteConfirm(false);
      setSuccessText('Error al eliminar datos');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const handleBackup = () => {
    try {
      // Collect all app data
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: {
          id: localStorage.getItem('yunta-user-id'),
          name: localStorage.getItem('yunta-user-name'),
          role: localStorage.getItem('yunta-user-role'),
        },
        savingsGoals: localStorage.getItem('yunta-savings-goals') || '[]',
        theme: localStorage.getItem('yunta-theme') || 'light',
        notifications: {
          enabled: localStorage.getItem('yunta-notifications-enabled') || 'false',
          prefs: localStorage.getItem('yunta-notifications-prefs') || '{}',
        },
        transactions: transactions,
      };

      // Create JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yunta-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessText('Backup guardado correctamente');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error creating backup:', error);
      setSuccessText('Error al crear backup');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const handleSaveNotifications = (enabled: boolean, prefs: any) => {
    try {
      localStorage.setItem('yunta-notifications-enabled', enabled.toString());
      localStorage.setItem('yunta-notifications-prefs', JSON.stringify(prefs));
      setSuccessText('Notificaciones actualizadas');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error saving notifications:', error);
      setSuccessText('Error al guardar notificaciones');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const options = [
    {
      id: 'export',
      label: 'Exportar Datos (CSV)',
      description: 'Descarga tus transacciones actuales',
      icon: Download,
      action: handleExport,
      variant: 'default' as const,
      disabled: transactions.length === 0,
    },
    {
      id: 'backup',
      label: 'Guardar Backup',
      description: 'Copia de seguridad completa',
      icon: Database,
      action: handleBackup,
      variant: 'default' as const,
      disabled: false,
    },
    {
      id: 'delete',
      label: 'Eliminar Datos',
      description: 'Borrar todos los datos (ALTO RIESGO)',
      icon: Trash2,
      action: () => setShowDeleteConfirm(true),
      variant: 'destructive' as const,
      disabled: userRole !== 'EJECUTIVO',
      requiresRole: 'EJECUTIVO',
    },
    {
      id: 'theme',
      label: 'Cambiar Tema',
      description: `Actual: ${theme === 'light' ? 'Claro' : 'Oscuro'}`,
      icon: Palette,
      action: () => {
        toggleTheme();
        const newTheme = theme === 'light' ? 'Oscuro' : 'Claro';
        setSuccessText(`Tema cambiado a ${newTheme}`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
      },
      variant: 'default' as const,
      disabled: false,
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      description: 'Configura alertas y recordatorios',
      icon: Bell,
      action: () => setShowNotificationsModal(true),
      variant: 'default' as const,
      disabled: false,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Drawer/Panel */}
        <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Centro de Opciones</h2>
                <p className="text-xs text-slate-500">Configuración y acciones avanzadas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Success Message Banner */}
          {showSuccessMessage && (
            <div className="px-6 py-3 bg-green-50 border-b border-green-100">
              <p className="text-sm text-green-700 font-medium">✓ {successText}</p>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {options.map((option) => {
                const Icon = option.icon;
                const isDisabled = option.disabled;
                const needsRole = option.requiresRole && userRole !== option.requiresRole;

                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    disabled={Boolean(isDisabled || needsRole)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      option.variant === 'destructive'
                        ? 'border-red-200 bg-red-50/50 hover:bg-red-100 hover:border-red-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    } ${
                      isDisabled || needsRole
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer shadow-sm'
                    } text-left`}
                  >
                    <div
                      className={`p-2.5 rounded-lg ${
                        option.variant === 'destructive'
                          ? 'bg-red-100'
                          : 'bg-indigo-100'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          option.variant === 'destructive' ? 'text-red-600' : 'text-indigo-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm ${
                          option.variant === 'destructive' ? 'text-red-900' : 'text-slate-800'
                        }`}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                      {needsRole && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                          Solo {option.requiresRole}
                        </span>
                      )}
                      {isDisabled && option.id === 'export' && (
                        <span className="inline-block mt-1 text-[10px] text-slate-400">
                          No hay datos para exportar
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400 text-center">
              Yunta v1.0 • {transactions.length} transacciones cargadas
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="⚠️ Eliminar Todos los Datos"
        message="Esta acción eliminará TODOS los datos de manera permanente e irreversible. Para confirmar, escribe exactamente 'BORRAR' en el campo de abajo."
        confirmText="Eliminar Todo"
        cancelText="Cancelar"
        variant="destructive"
        requiresInput={true}
        requiredInputValue="BORRAR"
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onSave={handleSaveNotifications}
      />
    </>
  );
}
