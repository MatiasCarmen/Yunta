'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, message.duration || 3000);

    return () => clearTimeout(timer);
  }, [message.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(message.id);
    }, 200);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  };

  const colors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${
        colors[message.type]
      } transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      {icons[message.type]}
      <p className="text-sm font-medium text-slate-800 flex-1">{message.message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-black/10 transition-colors"
      >
        <X className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for using toasts
let toastIdCounter = 0;
const toastListeners: Set<(toasts: ToastMessage[]) => void> = new Set();
let currentToasts: ToastMessage[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...currentToasts]));
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  const showToast = (type: ToastType, message: string, duration = 3000) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastMessage = { id, type, message, duration };
    currentToasts.push(newToast);
    notifyListeners();
  };

  const closeToast = (id: string) => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    notifyListeners();
  };

  return {
    toasts,
    showToast,
    closeToast,
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
  };
}
