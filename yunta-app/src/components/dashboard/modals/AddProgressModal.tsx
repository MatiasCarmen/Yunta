'use client';

import { useState } from 'react';
import { X, PiggyBank } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (amount: number) => void;
    goalLabel: string;
    current: number;
    target: number;
}

export default function AddProgressModal({
    isOpen,
    onClose,
    onAdd,
    goalLabel,
    current,
    target,
}: AddProgressModalProps) {
    const [amount, setAmount] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) return;

        onAdd(amountNum);
        setAmount('');
        onClose();
    };

    const remaining = Math.max(0, target - current);
    const percent = target > 0 ? (current / target) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
                    <h2 className="text-lg font-semibold text-slate-800">Agregar Progreso</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Goal info */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 mb-2">{goalLabel}</p>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span>Progreso: {percent.toFixed(0)}%</span>
                        <span className="tabular-nums">
                            S/ {current.toFixed(2)} / {target.toFixed(2)}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, percent)}%` }}
                        />
                    </div>
                    {remaining > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                            Faltan S/ {remaining.toFixed(2)} para alcanzar tu meta
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto a agregar (S/)</Label>
                        <div className="relative">
                            <Input
                                id="amount"
                                type="number"
                                placeholder="100.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0.01"
                                step="0.01"
                                required
                                className="pl-10"
                            />
                            <PiggyBank className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <PiggyBank className="w-4 h-4" />
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
