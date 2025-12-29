'use client';

import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from "@/lib/utils"; // Importing cn for potential class merging if needed later

// Tipos adaptados a YUNTA
interface Transaction {
    id: string;
    amount: number | string; // Prisma might return Decimal as string or number
    type: 'IN' | 'OUT';
    description: string;
    category?: string;
    date: string;
}

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [balanceData, setBalanceData] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0 });

    // EL CEREBRO NUEVO: Fetch a tu API de YUNTA
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Obtener transacciones recientes
                // TODO: En el futuro, pasar userId dinámico. Por ahora la API puede requerir autenticación o un userId.
                // Si la API falla por falta de userId, mostraremos el dashboard vacío pero bonito.
                const txRes = await fetch('/api/transactions?limit=10');

                if (!txRes.ok) {
                    throw new Error('Error al obtener transacciones');
                }

                const txData = await txRes.json();

                // 2. Procesar datos
                if (txData && Array.isArray(txData)) { // Ajuste: revisar si txData es array directo o txData.data
                    const dataList = Array.isArray(txData) ? txData : txData.data || [];
                    setTransactions(dataList);

                    // Calculo rápido para las tarjetas
                    const income = dataList
                        .filter((t: Transaction) => t.type === 'IN')
                        .reduce((acc: number, t: Transaction) => acc + Number(t.amount), 0);

                    const expense = dataList
                        .filter((t: Transaction) => t.type === 'OUT')
                        .reduce((acc: number, t: Transaction) => acc + Number(t.amount), 0);

                    setBalanceData({ totalIncome: income, totalExpenses: expense, balance: income - expense });
                }
            } catch (error) {
                console.error("Error cargando dashboard:", error);
                // No rompemos la UI, solo mostramos datos en 0
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
                </div>
                <Skeleton className="h-64 mt-8" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Resumen Financiero</h1>
                    <p className="text-muted-foreground mt-1">Tu balance general y movimientos recientes.</p>
                </div>

                <Button asChild className="gap-2 shadow-lg hover:shadow-xl transition-all">
                    <Link href="/dashboard/transactions/new">
                        <Plus className="h-4 w-4" /> Registrar Transacción
                    </Link>
                </Button>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400 pt-2">
                            {formatCurrency(balanceData.totalIncome)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 pt-2">
                            {formatCurrency(balanceData.totalExpenses)}
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-l-4 shadow-sm hover:shadow-md transition-shadow",
                    balanceData.balance >= 0 ? "border-l-primary" : "border-l-destructive"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Actual</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Scale className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold pt-2",
                            balanceData.balance >= 0 ? "text-primary" : "text-destructive"
                        )}>
                            {formatCurrency(balanceData.balance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Listado de Transacciones */}
            <div className="grid gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Transacciones Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No hay movimientos registrados para este periodo.</p>
                                <Button variant="link" asChild className="mt-2">
                                    <Link href="/dashboard/transactions/new">
                                        Crear tu primer movimiento →
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {transactions.map((t) => (
                                    <li key={t.id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                t.type === 'IN' ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30"
                                            )}>
                                                {t.type === 'IN' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{t.description}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()} • {t.category || 'General'}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "font-bold tabular-nums",
                                            t.type === 'IN' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {t.type === 'IN' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
