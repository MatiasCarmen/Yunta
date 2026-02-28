'use client';

import { useState, useCallback } from 'react';
import { Calculator, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const CALC_BUTTONS = ['7', '8', '9', '/', '4', '5', '6', 'x', '1', '2', '3', '-', 'C', '0', '=', '+'] as const;

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');

  const handleInput = useCallback((char: string) => {
    setDisplay((prev) => (prev === '0' || prev === 'Error' ? char : prev + char));
  }, []);

  const calculate = useCallback(() => {
    try {
      const res = new Function('return ' + display.replace(/x/g, '*'))();
      setDisplay(String(Number(res).toFixed(2)));
    } catch {
      setDisplay('Error');
    }
  }, [display]);

  const handleButton = useCallback(
    (btn: string) => {
      if (btn === 'C') setDisplay('0');
      else if (btn === '=') calculate();
      else handleInput(btn);
    },
    [calculate, handleInput]
  );

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'fixed z-50 rounded-full shadow-lg transition-all duration-200',
          'flex items-center justify-center',
          'bottom-6 right-4 sm:bottom-4 sm:right-4',
          'w-12 h-12 sm:w-14 sm:h-14',
          'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2',
          isOpen
            ? 'bg-slate-700 hover:bg-slate-800 text-white rotate-90'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label={isOpen ? 'Cerrar Calculadora' : 'Abrir Calculadora'}
      >
        {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />}
      </button>

      {/* Drawer / Panel */}
      {isOpen && (
        <>
          {/* Backdrop (solo mobile) */}
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Calculator panel */}
          <div
            className={cn(
              'fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200',
              'animate-in fade-in slide-in-from-bottom-4 duration-200',
              // Mobile: centrado abajo
              'bottom-20 right-4 left-4 sm:left-auto sm:w-[260px]',
              // Desktop: esquina inferior derecha
              'sm:bottom-20 sm:right-4'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-indigo-600" />
                Calculadora
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Display */}
            <div className="px-4 pt-3">
              <div className="bg-slate-100 rounded-lg p-3 text-right font-mono text-xl font-bold text-slate-800 h-12 flex items-center justify-end overflow-hidden">
                {display}
              </div>
            </div>

            {/* Buttons */}
            <div className="p-4 grid grid-cols-4 gap-2">
              {CALC_BUTTONS.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButton(btn)}
                  className={cn(
                    'h-10 rounded-lg text-sm font-bold transition-colors active:scale-95',
                    btn === 'C'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : btn === '='
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : ['+', '-', '/', 'x'].includes(btn)
                      ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : 'bg-slate-50 text-slate-800 hover:bg-slate-200'
                  )}
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Quick operations */}
            <div className="px-4 pb-3 flex gap-2">
              <button
                onClick={() => handleInput('.')}
                className="flex-1 h-8 rounded-lg bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                .
              </button>
              <button
                onClick={() => {
                  try {
                    const val = parseFloat(display);
                    if (!isNaN(val)) setDisplay(String((val * 100).toFixed(2)));
                  } catch {
                    setDisplay('Error');
                  }
                }}
                className="flex-1 h-8 rounded-lg bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ×100
              </button>
              <button
                onClick={() => {
                  try {
                    const val = parseFloat(display);
                    if (!isNaN(val)) setDisplay(String((val / 100).toFixed(2)));
                  } catch {
                    setDisplay('Error');
                  }
                }}
                className="flex-1 h-8 rounded-lg bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ÷100
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
