'use client';

import { useState, useEffect } from 'react';
import { X, Bell, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface NotificationPreferences {
  lowBalance: boolean;
  goalCompleted: boolean;
  largeTransaction: boolean;
  dailySummary: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (enabled: boolean, prefs: NotificationPreferences) => void;
}

const STORAGE_KEY_ENABLED = 'yunta-notifications-enabled';
const STORAGE_KEY_PREFS = 'yunta-notifications-prefs';

export default function NotificationsModal({ isOpen, onClose, onSave }: NotificationsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    lowBalance: true,
    goalCompleted: true,
    largeTransaction: true,
    dailySummary: false,
  });

  useEffect(() => {
    if (isOpen) {
      try {
        const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
        const storedPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
        setEnabled(storedEnabled);
        if (storedPrefs) {
          setPrefs(JSON.parse(storedPrefs));
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(enabled, prefs);
    onClose();
  };

  const togglePref = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Notificaciones</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base font-semibold">Habilitar notificaciones</Label>
              <p className="text-xs text-slate-500 mt-1">
                Recibe alertas sobre tu actividad financiera
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Preferences */}
          {enabled && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-semibold text-slate-700">Tipos de notificaciones</p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.lowBalance}
                    onChange={() => togglePref('lowBalance')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Saldo bajo</p>
                    <p className="text-xs text-slate-500">Cuando tu saldo esté por debajo del 20%</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.goalCompleted}
                    onChange={() => togglePref('goalCompleted')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Meta completada</p>
                    <p className="text-xs text-slate-500">Al alcanzar una meta de ahorro</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.largeTransaction}
                    onChange={() => togglePref('largeTransaction')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Transacción grande</p>
                    <p className="text-xs text-slate-500">Movimientos mayores a S/ 500</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.dailySummary}
                    onChange={() => togglePref('dailySummary')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Resumen diario</p>
                    <p className="text-xs text-slate-500">Cada noche a las 20:00</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
