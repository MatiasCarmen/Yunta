'use client';

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

interface SpendingChartProps {
    transactions: any[]; // Usamos any por simplicidad, idealmente tu tipo Transaction
}

export function SpendingChart({ transactions }: SpendingChartProps) {
    const chartData = useMemo(() => {
        // Filtramos solo gastos (OUT)
        const expenses = transactions.filter((t) => t.type === "OUT");
        const spendingByCategory: { [key: string]: number } = {};

        expenses.forEach((expense) => {
            // Si no tiene categoría, usamos "General"
            const cat = expense.category || "General";
            spendingByCategory[cat] = (spendingByCategory[cat] || 0) + Number(expense.amount);
        });

        return Object.entries(spendingByCategory).map(([category, total]) => ({
            category,
            total,
        }));
    }, [transactions]);

    return (
        <Card className="col-span-1 md:col-span-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <TrendingDown className="h-5 w-5" />
                    Gastos por Categoría
                </CardTitle>
                <CardDescription>Desglose de gastos del periodo actual.</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                                <XAxis
                                    dataKey="category"
                                    tickLine={false}
                                    tickMargin={12}
                                    axisLine={false}
                                    fontSize={12}
                                    stroke="hsl(var(--muted-foreground))"
                                />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid hsl(var(--border))',
                                        backgroundColor: 'hsl(var(--popover))',
                                        color: 'hsl(var(--popover-foreground))',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Total']}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="hsl(var(--primary))"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                        <TrendingDown className="h-10 w-10 mb-2 opacity-20" />
                        <p>No hay datos de gastos aún.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
