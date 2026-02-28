'use client';

import React from 'react';
import { X, Wallet, AlertTriangle, Archive, FolderArchive, Trash2, FileBarChart, Settings, LogOut } from 'lucide-react';

interface MobileJuntaMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  junta: {
    id: string;
  } | null;
  onCajaClick: () => void;
  onAlertasClick: () => void;
  onArchivarClick: () => void;
  onHistorialClick: () => void;
  onReiniciarClick: () => void;
  onLogout: () => void;
}

export default function MobileJuntaMoreDrawer({
  isOpen,
  onClose,
  junta,
  onCajaClick,
  onAlertasClick,
  onArchivarClick,
  onHistorialClick,
  onReiniciarClick,
  onLogout,
}: MobileJuntaMoreDrawerProps) {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'caja',
      icon: Wallet,
      title: 'Caja',
      description: 'Gestionar caja y transacciones',
      onClick: () => {
        onCajaClick();
        onClose();
      },
      variant: 'default' as const,
    },
    {
      id: 'alertas',
      icon: AlertTriangle,
      title: 'Alertas',
      description: 'Ver problemas y pendientes',
      onClick: () => {
        onAlertasClick();
        onClose();
      },
      variant: 'warning' as const,
    },
    {
      id: 'historial',
      icon: FolderArchive,
      title: 'Historial de Juntas',
      description: 'Ver juntas archivadas',
      onClick: () => {
        onHistorialClick();
        onClose();
      },
      variant: 'default' as const,
    },
    {
      id: 'archivar',
      icon: Archive,
      title: 'Archivar Junta Actual',
      description: 'Guardar y finalizar esta junta',
      onClick: () => {
        onArchivarClick();
        onClose();
      },
      variant: 'default' as const,
    },
    {
      id: 'reiniciar',
      icon: Trash2,
      title: 'Reiniciar Sistema',
      description: 'Borrar junta actual y empezar de nuevo',
      onClick: () => {
        onReiniciarClick();
        onClose();
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Opciones de Junta</h2>
            <p className="text-xs text-slate-500 mt-0.5">Acciones y configuración</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-4 py-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left active:scale-[0.98] ${
                  item.variant === 'destructive'
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-100 hover:border-red-300'
                    : item.variant === 'warning'
                    ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    item.variant === 'destructive'
                      ? 'bg-red-100'
                      : item.variant === 'warning'
                      ? 'bg-amber-100'
                      : 'bg-indigo-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      item.variant === 'destructive'
                        ? 'text-red-600'
                        : item.variant === 'warning'
                        ? 'text-amber-600'
                        : 'text-indigo-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm ${
                      item.variant === 'destructive' ? 'text-red-900' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </button>
            );
          })}

          {/* Divider */}
          <div className="border-t border-slate-200 my-2" />

          {/* Volver al Dashboard */}
          <button
            onClick={() => {
              window.location.href = '/dashboard';
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left active:scale-[0.98]"
          >
            <div className="p-2.5 bg-slate-100 rounded-lg shrink-0">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800">Volver al Dashboard</p>
              <p className="text-xs text-slate-500 mt-0.5">Inicio principal</p>
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100 transition-all text-left active:scale-[0.98]"
          >
            <div className="p-2.5 bg-red-100 rounded-lg shrink-0">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-red-900">Cerrar Sesión</p>
              <p className="text-xs text-red-600 mt-0.5">Salir de tu cuenta</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
