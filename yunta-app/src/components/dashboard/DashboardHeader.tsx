'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    PlusCircle,
    Users,
    Shield,
    LogOut,
    Search,
    CalendarDays,
    ChevronDown,
    FileBarChart,
} from 'lucide-react';

interface DashboardHeaderProps {
    userName: string | null;
    userRole: string | null;
    onLogout: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

type PeriodOption = 'Este mes' | 'Esta semana' | 'Todo';

export default function DashboardHeader({
    userName,
    userRole,
    onLogout,
    searchQuery,
    onSearchChange,
}: DashboardHeaderProps) {
    const [period, setPeriod] = useState<PeriodOption>('Este mes');
    const [showPeriodMenu, setShowPeriodMenu] = useState(false);

    const periodOptions: PeriodOption[] = ['Este mes', 'Esta semana', 'Todo'];

    return (
        <div className="space-y-4">
            {/* Fila principal */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Izquierda: Saludo */}
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        Hola, {userName || 'Familia'} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Tu resumen financiero al momento
                    </p>
                </div>

                {/* Centro: Buscador */}
                <div className="w-full lg:max-w-sm order-3 lg:order-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar transacciones..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 h-9 bg-muted/40 border-border/50 text-sm"
                        />
                    </div>
                </div>

                {/* Derecha: Acciones y filtros */}
                <div className="flex flex-wrap items-center gap-2 order-2 lg:order-3">
                    {/* Filtro de periodo */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs font-medium border-border/50"
                            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                        >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {period}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                        {showPeriodMenu && (
                            <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                                {periodOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                                            period === opt ? 'text-primary font-medium' : 'text-foreground'
                                        }`}
                                        onClick={() => {
                                            setPeriod(opt);
                                            setShowPeriodMenu(false);
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reportes - disabled */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-xs font-medium opacity-50 cursor-not-allowed border-border/50"
                        disabled
                        title="Próximamente"
                    >
                        <FileBarChart className="h-3.5 w-3.5" />
                        Reportes
                    </Button>

                    {/* Nuevo Movimiento */}
                    <Button
                        asChild
                        size="sm"
                        className="h-9 gap-1.5 text-xs font-medium shadow-sm"
                    >
                        <Link href="/dashboard/transactions/new">
                            <PlusCircle className="h-3.5 w-3.5" />
                            Nuevo
                        </Link>
                    </Button>

                    {/* Ver Junta */}
                    {(userRole === 'EJECUTIVO' || userRole === 'GESTOR') && (
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs font-medium border-primary/20 hover:bg-primary/5 text-primary"
                        >
                            <Link href="/dashboard/junta">
                                <Users className="h-3.5 w-3.5" />
                                Junta
                            </Link>
                        </Button>
                    )}

                    {/* Admin */}
                    {userRole === 'EJECUTIVO' && (
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs font-medium border-amber-200 hover:bg-amber-50 text-amber-700"
                        >
                            <Link href="/dashboard/admin/users">
                                <Shield className="h-3.5 w-3.5" />
                                Admin
                            </Link>
                        </Button>
                    )}

                    {/* Logout */}
                    <Button
                        onClick={onLogout}
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 border-red-200 hover:bg-red-50 hover:text-red-600 text-red-500"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
