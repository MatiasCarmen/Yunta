'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Plus, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import GoalModal from './modals/GoalModal';
import AddProgressModal from './modals/AddProgressModal';
import { ConfirmDialog } from '@/components/ui/dialog';

interface Goal {
    id: string;
    label: string;
    current: number;
    target: number;
    color: string;
    createdAt?: string;
}

const STORAGE_KEY = 'yunta-savings-goals';

export default function GoalsCard() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

    // Load goals from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setGoals(parsed);
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    }, []);

    // Save goals to localStorage
    const saveGoals = (newGoals: Goal[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newGoals));
            setGoals(newGoals);
        } catch (error) {
            console.error('Error saving goals:', error);
        }
    };

    const handleSaveGoal = (goal: Goal) => {
        const newGoals = editingGoal
            ? goals.map((g) => (g.id === goal.id ? goal : g))
            : [...goals, { ...goal, createdAt: new Date().toISOString() }];
        saveGoals(newGoals);
        setEditingGoal(null);
    };

    const handleAddProgress = (amount: number) => {
        if (!selectedGoal) return;
        const newGoals = goals.map((g) =>
            g.id === selectedGoal.id ? { ...g, current: Math.min(g.target, g.current + amount) } : g
        );
        saveGoals(newGoals);
        setSelectedGoal(null);
    };

    const handleDeleteGoal = () => {
        if (!goalToDelete) return;
        const newGoals = goals.filter((g) => g.id !== goalToDelete.id);
        saveGoals(newGoals);
        setGoalToDelete(null);
        setShowDeleteConfirm(false);
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setShowGoalModal(true);
    };

    const openProgressModal = (goal: Goal) => {
        setSelectedGoal(goal);
        setShowProgressModal(true);
    };

    const confirmDelete = (goal: Goal) => {
        setGoalToDelete(goal);
        setShowDeleteConfirm(true);
    };

    return (
        <>
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                Metas de Ahorro
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {goals.length === 0 ? 'Crea tus primeras metas' : `${goals.length} meta${goals.length !== 1 ? 's' : ''} activa${goals.length !== 1 ? 's' : ''}`}
                            </CardDescription>
                        </div>
                        <button
                            onClick={() => {
                                setEditingGoal(null);
                                setShowGoalModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                            title="Nueva meta"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {goals.length === 0 ? (
                        <div className="text-center py-8">
                            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">
                                No tienes metas de ahorro todavía
                            </p>
                            <button
                                onClick={() => setShowGoalModal(true)}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Crear primera meta
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {goals.map((goal) => {
                                const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                                const isComplete = goal.current >= goal.target;
                                return (
                                    <div key={goal.id} className="group">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="font-medium text-slate-700">{goal.label}</span>
                                            <span className="text-slate-600 tabular-nums">
                                                S/ {goal.current.toFixed(0)} / {goal.target.toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="relative mb-2">
                                            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${goal.color} rounded-full transition-all duration-1000 ${
                                                        isComplete ? 'opacity-100' : 'opacity-70'
                                                    }`}
                                                    style={{ width: `${Math.max(3, Math.min(100, percent))}%` }}
                                                />
                                            </div>
                                            {/* Gauge marker */}
                                            <div
                                                className={`absolute top-1/2 -translate-y-1/2 w-1 h-4 ${goal.color} rounded-full`}
                                                style={{ left: `${Math.max(1, Math.min(99, percent))}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!isComplete && (
                                                <button
                                                    onClick={() => openProgressModal(goal)}
                                                    className="flex-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <TrendingUp className="h-3 w-3" />
                                                    Agregar
                                                </button>
                                            )}
                                            {isComplete && (
                                                <div className="flex-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded text-center font-medium">
                                                    ✓ Completada
                                                </div>
                                            )}
                                            <button
                                                onClick={() => openEditModal(goal)}
                                                className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(goal)}
                                                className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <GoalModal
                isOpen={showGoalModal}
                onClose={() => {
                    setShowGoalModal(false);
                    setEditingGoal(null);
                }}
                onSave={handleSaveGoal}
                editingGoal={editingGoal}
            />

            <AddProgressModal
                isOpen={showProgressModal}
                onClose={() => {
                    setShowProgressModal(false);
                    setSelectedGoal(null);
                }}
                onAdd={handleAddProgress}
                goalLabel={selectedGoal?.label || ''}
                current={selectedGoal?.current || 0}
                target={selectedGoal?.target || 0}
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setGoalToDelete(null);
                }}
                onConfirm={handleDeleteGoal}
                title="Eliminar Meta"
                message={`¿Estás seguro de que quieres eliminar la meta "${goalToDelete?.label}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
            />
        </>
    );
}
