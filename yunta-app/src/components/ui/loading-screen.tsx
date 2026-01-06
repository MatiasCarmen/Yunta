import React from 'react';
import { Loader2, Coins } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingScreen({ isLoading, message = "Procesando..." }: LoadingScreenProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full mx-4">
        
        {/* Icono animado principal */}
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative bg-indigo-50 p-4 rounded-full">
            <Coins className="h-10 w-10 text-indigo-600 animate-bounce" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
             <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          </div>
        </div>

        {/* Texto de carga */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            Un momento, por favor
          </h3>
          <p className="text-sm text-slate-500 animate-pulse">
            {message}
          </p>
        </div>

        {/* Barra de progreso decorativa */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_2s_ease-in-out_infinite] rounded-full" 
               style={{ width: '60%' }}></div>
        </div>

      </div>
    </div>
  );
}
