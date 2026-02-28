'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
    Wallet,
    ArrowUp,
    ArrowDown,
    HeartPulse,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';

interface SummaryData {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    junta: number;
}

interface StatsRowProps {
    data: SummaryData;
}

function getHealthInfo(income: number, expenses: number) {
    if (income === 0 && expenses === 0) {
        return { label: '—', sublabel: 'Pendiente', percent: null, color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Minus };
    }

    if (income === 0 && expenses > 0) {
        return { label: 'Crítica', sublabel: 'Sin ingresos', percent: 0, color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown };
    }

    const ratio = ((income - expenses) / income) * 100;

    if (ratio > 50) {
        return { label: 'Excelente', sublabel: `${ratio.toFixed(0)}% margen`, percent: ratio, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp };
    }
    if (ratio > 20) {
        return { label: 'Buena', sublabel: `${ratio.toFixed(0)}% margen`, percent: ratio, color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp };
    }
    if (ratio > 0) {
        return { label: 'Regular', sublabel: `${ratio.toFixed(0)}% margen`, percent: ratio, color: 'text-amber-600', bg: 'bg-amber-50', icon: Minus };
    }

    return { label: 'Crítica', sublabel: `${ratio.toFixed(0)}% margen`, percent: ratio, color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown };
}

export default function StatsRow({ data }: StatsRowProps) {
    const health = getHealthInfo(data.totalIncome, data.totalExpenses);
    const HealthIcon = health.icon;

    const cards = [
        {
            title: 'Balance Total',
            value: `S/ ${data.balance?.toFixed(2) || '0.00'}`,
            subtitle: 'Disponible ahora',
            icon: Wallet,
            iconColor: 'text-blue-500',
            borderColor: 'border-l-blue-500',
            valueColor: '',
        },
        {
            title: 'Ingresos',
            value: `S/ ${data.totalIncome?.toFixed(2) || '0.00'}`,
            subtitle: 'Este periodo',
            icon: ArrowUp,
            iconColor: 'text-emerald-500',
            borderColor: 'border-l-emerald-500',
            valueColor: 'text-emerald-600',
        },
        {
            title: 'Gastos',
            value: `S/ ${data.totalExpenses?.toFixed(2) || '0.00'}`,
            subtitle: 'Este periodo',
            icon: ArrowDown,
            iconColor: 'text-red-500',
            borderColor: 'border-l-red-500',
            valueColor: 'text-red-600',
        },
        {
            title: 'Salud Financiera',
            value: health.label,
            subtitle: health.sublabel,
            icon: HeartPulse,
            iconColor: health.color,
            borderColor: 'border-l-violet-500',
            valueColor: health.color,
            isHealth: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={card.title}
                        className={`shadow-sm border-l-4 ${card.borderColor} hover:shadow-md transition-shadow`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {card.title}
                                </span>
                                <div className={`p-1.5 rounded-md ${card.isHealth ? health.bg : 'bg-muted/50'}`}>
                                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                                </div>
                            </div>
                            <div className={`text-xl font-bold ${card.valueColor} leading-tight`}>
                                {card.value}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.subtitle}
                            </p>
                            {card.isHealth && health.percent !== null && (
                                <div className="mt-2">
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                health.percent > 50
                                                    ? 'bg-emerald-500'
                                                    : health.percent > 20
                                                    ? 'bg-blue-500'
                                                    : health.percent > 0
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.max(0, Math.min(100, health.percent))}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
