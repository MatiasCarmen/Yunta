'use client';

import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from "@/lib/utils";

// Importamos los nuevos componentes inteligentes
import { SpendingChart } from '@/components/SpendingChart';
import { TransactionList } from '@/components/TransactionList';

// Tipos adaptados a YUNTA
interface Transaction {
    id: string;
    amount: number | string;
    type: 'IN' | 'OUT';
    description: string;
    category?: string;
    date: string;
}

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [balanceData, setBalanceData] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Pedimos 50 para tener datos suficientes para el gráfico
                const txRes = await fetch('/api/transactions?limit=50');

                if (!txRes.ok) {
                    throw new Error('Error al obtener transacciones');
                }

                const txData = await txRes.json();

                if (txData || txData.data) {
                    const dataList = Array.isArray(txData) ? txData : txData.data || [];
                    setTransactions(dataList);

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <Skeleton className="h-[300px] col-span-2" />
                    <Skeleton className="h-[400px] col-span-2" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Resumen Financiero</h1>
                    <p className="text-muted-foreground mt-1">Tu balance general y movimientos detallados.</p>
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

            {/* Visualización de Datos (Gráficos y Tablas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Ocupa todo el ancho en móvil, mitad en escritorio si agregamos más cosas, o full width como pediste */}
                <div className="col-span-1 md:col-span-2">
                    <SpendingChart transactions={transactions} />
                </div>

                {/* Lista de Transacciones - Ocupa todo el ancho */}
                <div className="col-span-1 md:col-span-2">
                    <TransactionList transactions={transactions} />
                </div>
            </div>
        </div>
    );
}
