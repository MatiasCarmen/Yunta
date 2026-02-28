'use client';

import React from 'react';
import { X, FileBarChart, Settings, LogOut, Shield, Calendar } from 'lucide-react';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string | null;
  onReportsClick: () => void;
  onOptionsClick: () => void;
  onLogout: () => void;
}

export default function MobileMoreDrawer({
  isOpen,
  onClose,
  userRole,
  onReportsClick,
  onOptionsClick,
  onLogout,
}: MobileMoreDrawerProps) {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'reports',
      icon: FileBarChart,
      title: 'Reportes Avanzados',
      description: 'Análisis detallado y exportar datos',
      onClick: () => {
        onReportsClick();
        onClose();
      },
      disabled: false,
    },
    {
      id: 'meetings',
      icon: Calendar,
      title: 'Reuniones',
      description: 'Gestionar reuniones familiares',
      onClick: () => {
        window.location.href = '/dashboard/meetings';
      },
      disabled: false,
    },
    {
      id: 'options',
      icon: Settings,
      title: 'Opciones',
      description: 'Exportar, backup y configuración',
      onClick: () => {
        onOptionsClick();
        onClose();
      },
      disabled: false,
    },
  ];

  // Add admin option for EJECUTIVO role
  if (userRole === 'EJECUTIVO') {
    menuItems.push({
      id: 'admin',
      icon: Shield,
      title: 'Administración',
      description: 'Gestionar usuarios y permisos',
      onClick: () => {
        window.location.href = '/dashboard/admin/users';
      },
      disabled: false,
    });
  }

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
            <h2 className="text-lg font-semibold text-slate-800">Más opciones</h2>
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
                disabled={item.disabled}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  item.disabled
                    ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]'
                }`}
              >
                <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  {item.disabled && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                      Próximamente
                    </span>
                  )}
                </div>
              </button>
            );
          })}

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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 text-center">
            Yunta v1.0 • {userRole || 'Usuario'}
          </p>
        </div>
      </div>
    </div>
  );
}
