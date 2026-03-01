'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: { id: string; label: string; target: number; color: string; current: number; createdAt?: string }) => void;
    editingGoal?: { id: string; label: string; target: number; color: string; current: number; createdAt?: string } | null;
}

const COLORS = [
    { name: 'Esmeralda', value: 'bg-emerald-500' },
    { name: 'Azul', value: 'bg-blue-500' },
    { name: 'Violeta', value: 'bg-violet-500' },
    { name: 'Ámbar', value: 'bg-amber-500' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Índigo', value: 'bg-indigo-500' },
];

export default function GoalModal({ isOpen, onClose, onSave, editingGoal }: GoalModalProps) {
    const [label, setLabel] = useState('');
    const [target, setTarget] = useState('');
    const [color, setColor] = useState(COLORS[0].value);

    useEffect(() => {
        if (editingGoal) {
            setLabel(editingGoal.label);
            setTarget(editingGoal.target.toString());
            setColor(editingGoal.color);
        } else {
            setLabel('');
            setTarget('');
            setColor(COLORS[0].value);
        }
    }, [editingGoal, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetNum = parseFloat(target);
        if (!label.trim() || isNaN(targetNum) || targetNum <= 0) return;

        onSave({
            id: editingGoal?.id || Date.now().toString(),
            label: label.trim(),
            target: targetNum,
            color,
            current: editingGoal?.current || 0,
        });

        setLabel('');
        setTarget('');
        setColor(COLORS[0].value);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {editingGoal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="goal-label">Nombre de la meta</Label>
                        <Input
                            id="goal-label"
                            type="text"
                            placeholder="Ej: Fondo de emergencia"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="goal-target">Monto objetivo (S/)</Label>
                        <Input
                            id="goal-target"
                            type="number"
                            placeholder="1000"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            min="1"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-6 gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`h-10 ${c.value} rounded-lg transition-all ${
                                        color === c.value
                                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                                            : 'hover:scale-105'
                                    }`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

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
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
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
