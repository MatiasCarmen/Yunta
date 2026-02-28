'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

interface Transaction {
    id: string;
    amount: number | string;
    type: 'IN' | 'OUT';
    description: string;
    category?: string;
    date: string;
    method?: string;
    user?: { name: string };
}

interface ExpenseAnalysisCardProps {
    transactions: Transaction[];
}

const CATEGORY_COLORS = [
    { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    { bar: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
    { bar: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-50' },
    { bar: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' },
    { bar: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' },
    { bar: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
];

export default function ExpenseAnalysisCard({ transactions }: ExpenseAnalysisCardProps) {
    const chartData = useMemo(() => {
        const expenses = transactions.filter((t) => t.type === 'OUT');
        const totals: Record<string, number> = {};
        let totalExpenses = 0;

        expenses.forEach((t) => {
            const cat = t.category || 'Otros';
            const amt = Number(t.amount);
            totals[cat] = (totals[cat] || 0) + amt;
            totalExpenses += amt;
        });

        return Object.keys(totals)
            .map((cat, index) => ({
                category: cat,
                amount: totals[cat],
                percent: totalExpenses > 0 ? (totals[cat] / totalExpenses) * 100 : 0,
                color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [transactions]);

    const maxAmount = chartData.length > 0 ? Math.max(...chartData.map((d) => d.amount)) : 100;

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    Análisis de Gastos
                </CardTitle>
                <CardDescription className="text-xs">Top categorías del periodo</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {chartData.length === 0 ? (
                        <div className="text-center text-muted-foreground py-6 text-sm">
                            No hay gastos registrados aún.
                        </div>
                    ) : (
                        chartData.map((item) => (
                            <div key={item.category} className="group cursor-default">
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${item.color.bar}`} />
                                        <span className="font-medium text-xs group-hover:text-primary transition-colors">
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            {item.percent.toFixed(0)}%
                                        </span>
                                        <span className="text-xs font-semibold tabular-nums">
                                            S/ {item.amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color.bar} rounded-full transition-all duration-1000 ease-out`}
                                        style={{
                                            width: `${(item.amount / maxAmount) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
