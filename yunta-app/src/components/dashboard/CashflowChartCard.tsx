'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    ResponsiveContainer,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

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

interface CashflowChartCardProps {
    transactions: Transaction[];
}

export default function CashflowChartCard({ transactions }: CashflowChartCardProps) {
    const data = useMemo(() => {
        const groups: Record<string, { in: number; out: number }> = {};
        const days = 7;

        transactions.forEach((t) => {
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
            });

            if (!groups[dateStr]) groups[dateStr] = { in: 0, out: 0 };

            if (t.type === 'IN') groups[dateStr].in += Number(t.amount);
            else groups[dateStr].out += Number(t.amount);
        });

        const sortedKeys = Object.keys(groups).slice(0, days).reverse();
        return sortedKeys.map((key) => ({
            name: key,
            Ingresos: groups[key].in,
            Gastos: groups[key].out,
        }));
    }, [transactions]);

    // Calcular totales para el mini-resumen
    const totals = useMemo(() => {
        const inc = data.reduce((a, d) => a + d.Ingresos, 0);
        const exp = data.reduce((a, d) => a + d.Gastos, 0);
        return { income: inc, expense: exp, net: inc - exp };
    }, [data]);

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Flujo de Caja
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Ingresos vs Gastos · últimos 7 días activos
                        </CardDescription>
                    </div>
                    {data.length > 0 && (
                        <div className="text-right hidden sm:block">
                            <span
                                className={`text-sm font-bold ${
                                    totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                                }`}
                            >
                                {totals.net >= 0 ? '+' : ''}S/ {totals.net.toFixed(2)}
                            </span>
                            <p className="text-[10px] text-muted-foreground">Neto del periodo</p>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent 
                className="h-[240px] w-full" 
                style={{ minHeight: 240 }}
            >
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos suficientes para graficar
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
                        >
                            <defs>
                                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border))"
                                strokeOpacity={0.5}
                            />
                            <XAxis
                                dataKey="name"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `S/${v}`}
                                width={55}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                                    fontSize: '12px',
                                    backgroundColor: 'hsl(var(--card))',
                                }}
                                formatter={(value: unknown) => [
                                    `S/ ${Number(value).toFixed(2)}`,
                                    undefined,
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="Ingresos"
                                stroke="#16a34a"
                                strokeWidth={2.5}
                                dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Gastos"
                                stroke="#dc2626"
                                strokeWidth={2.5}
                                dot={{ fill: '#dc2626', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
