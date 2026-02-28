'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

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

interface PlaceholderBudgetCardProps {
    transactions: Transaction[];
}

const BUDGET_COLORS: Record<string, { fill: string; bg: string }> = {
    Comida: { fill: 'bg-blue-500', bg: 'bg-blue-100' },
    Movilidad: { fill: 'bg-indigo-500', bg: 'bg-indigo-100' },
    Mercadería: { fill: 'bg-pink-500', bg: 'bg-pink-100' },
    Otros: { fill: 'bg-gray-400', bg: 'bg-gray-100' },
};

export default function PlaceholderBudgetCard({ transactions }: PlaceholderBudgetCardProps) {
    // Derivar "presupuesto estimado" del gasto promedio por categoría
    const budgetData = useMemo(() => {
        const expenses = transactions.filter((t) => t.type === 'OUT');
        if (expenses.length === 0) return [];

        const totals: Record<string, number> = {};
        expenses.forEach((t) => {
            const cat = t.category || 'Otros';
            totals[cat] = (totals[cat] || 0) + Number(t.amount);
        });

        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([category, actual]) => {
                // Estimar presupuesto como 120% del gasto real (solo visual, no persistido)
                const budget = actual * 1.2;
                const percent = (actual / budget) * 100;
                const colors = BUDGET_COLORS[category] || BUDGET_COLORS['Otros'];
                return { category, actual, budget, percent, colors };
            });
    }, [transactions]);

    const hasData = budgetData.length > 0;

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Presupuesto vs. Real
                </CardTitle>
                <CardDescription className="text-xs">
                    {hasData ? 'Estimación basada en tus gastos' : 'Próximamente'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="space-y-4 py-2">
                        {['Comida', 'Movilidad', 'Otros'].map((label) => (
                            <div key={label}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="text-muted-foreground/50">— / —</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full" />
                            </div>
                        ))}
                        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
                            Registra gastos para ver tu análisis
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgetData.map((item) => (
                            <div key={item.category}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium">{item.category}</span>
                                    <span className="text-muted-foreground tabular-nums">
                                        S/ {item.actual.toFixed(0)}{' '}
                                        <span className="text-muted-foreground/50">
                                            / {item.budget.toFixed(0)}
                                        </span>
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.colors.fill} rounded-full transition-all duration-1000`}
                                        style={{
                                            width: `${Math.min(100, item.percent)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
