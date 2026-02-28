'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface GoalItem {
    label: string;
    current: number;
    target: number;
    color: string;
}

const STATIC_GOALS: GoalItem[] = [
    { label: 'Fondo de emergencia', current: 0, target: 1000, color: 'bg-emerald-500' },
    { label: 'Vacaciones', current: 0, target: 2000, color: 'bg-blue-500' },
    { label: 'Inversión', current: 0, target: 5000, color: 'bg-violet-500' },
];

export default function PlaceholderGoalsCard() {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Metas de Ahorro
                </CardTitle>
                <CardDescription className="text-xs">Próximamente</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {STATIC_GOALS.map((goal) => {
                        const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                        return (
                            <div key={goal.label}>
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="font-medium text-muted-foreground">{goal.label}</span>
                                    <span className="text-muted-foreground/50 tabular-nums">
                                        S/ {goal.current} / {goal.target}
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${goal.color} rounded-full transition-all duration-1000 opacity-30`}
                                            style={{ width: `${Math.max(3, percent)}%` }}
                                        />
                                    </div>
                                    {/* Gauge marker */}
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 w-1 h-4 ${goal.color} rounded-full opacity-40`}
                                        style={{ left: `${Math.max(1, percent)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
                        Configura tus metas para hacer seguimiento
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
