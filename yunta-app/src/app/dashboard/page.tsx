'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from "@/components/ui/skeleton";
import {
    PlusCircle,
    Users,
    ArrowDown,
    ArrowUp,
    Wallet,
    CreditCard,
    ShoppingCart,
    Utensils,
    Bus,
    Banknote,
    Package,
    Sparkles,
    Loader2,
    LogOut,
    Shield
} from 'lucide-react';

// --- TIPOS ---
interface Transaction {
    id: string;
    amount: number | string;
    type: 'IN' | 'OUT';
    description: string;
    category?: string;
    date: string;
    method?: string;
    user?: {
        name: string;
    };
}

type SummaryData = {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    junta: number;
};

// --- UTILIDADES DE COLOR Y ICONOS ---
const getCategoryColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-gray-500'];
    return colors[index % colors.length];
};

const getCategoryIcon = (cat?: string) => {
    if (!cat) return <ShoppingCart className="h-4 w-4" />;
    const c = cat.toUpperCase();
    if (c.includes('COMIDA') || c === 'FOOD') return <Utensils className="h-4 w-4" />;
    if (c.includes('MOVILIDAD') || c === 'MOBILITY') return <Bus className="h-4 w-4" />;
    if (c.includes('MERCADERIA') || c === 'MERCHANDISE') return <Package className="h-4 w-4" />;
    return <ShoppingCart className="h-4 w-4" />;
};

// --- SUB-COMPONENTES CONECTADOS ---

function SummaryCards({ data }: { data: SummaryData }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">S/ {data.balance?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-muted-foreground mt-1">Disponible ahora</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                    <ArrowUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">S/ {data.totalIncome?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-muted-foreground mt-1">Este periodo</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">S/ {data.totalExpenses?.toFixed(2) || '0.00'}</div>
                    <p className="text-xs text-muted-foreground mt-1">Este periodo</p>
                </CardContent>
            </Card>
        </div>
    );
}

function SpendingChart({ transactions }: { transactions: Transaction[] }) {
    // Procesar datos reales para el gráfico
    const chartData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'OUT');
        const totals: Record<string, number> = {};

        expenses.forEach(t => {
            const cat = t.category || 'Otros';
            totals[cat] = (totals[cat] || 0) + Number(t.amount);
        });

        const categories = Object.keys(totals).map((cat, index) => ({
            category: cat,
            amount: totals[cat],
            color: getCategoryColor(index)
        })).sort((a, b) => b.amount - a.amount).slice(0, 5); // Top 5

        return categories;
    }, [transactions]);

    const maxAmount = chartData.length > 0 ? Math.max(...chartData.map(d => d.amount)) : 100;

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>Análisis de Gastos</CardTitle>
                <CardDescription>Top 5 categorías del periodo</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mt-2">
                    {chartData.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No hay gastos registrados aún.
                        </div>
                    ) : (
                        chartData.map((item) => (
                            <div key={item.category} className="space-y-1 group cursor-default">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium group-hover:text-primary transition-colors">{item.category}</span>
                                    <span className="text-muted-foreground">S/ {item.amount.toFixed(2)}</span>
                                </div>
                                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${(item.amount / maxAmount) * 100}%` }}
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

function CashFlowChart({ transactions }: { transactions: Transaction[] }) {
    const data = useMemo(() => {
        // Group by Date (YYYY-MM-DD)
        const groups: Record<string, { in: number, out: number }> = {};
        const days = 7; // Shows last 7 active days where there were transactions

        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const rawDate = dateObj.toISOString().split('T')[0];
            const dateStr = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

            if (!groups[dateStr]) groups[dateStr] = { in: 0, out: 0 };

            if (t.type === 'IN') groups[dateStr].in += Number(t.amount);
            else groups[dateStr].out += Number(t.amount);
        });

        const sortedKeys = Object.keys(groups).slice(0, days).reverse(); // limit and reverse for chronological
        return sortedKeys.map(key => ({
            name: key,
            Ingresos: groups[key].in,
            Gastos: groups[key].out
        }));
    }, [transactions]);

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle>Flujo de Caja Reciente</CardTitle>
                <CardDescription>Ingresos vs Gastos por día</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] mt-4 w-full">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos suficientes para graficar
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="name"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `S/${value}`}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, undefined]}
                            />
                            <Line
                                type="monotone"
                                dataKey="Ingresos"
                                stroke="#16a34a"
                                strokeWidth={3}
                                dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Gastos"
                                stroke="#dc2626"
                                strokeWidth={3}
                                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>Últimos Movimientos</CardTitle>
                <CardDescription>Historial en tiempo real</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {transactions.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>Sin movimientos recientes.</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center group p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Avatar className={`h-9 w-9 border transition-colors ${tx.type === 'IN' ? 'bg-green-100 border-green-200 group-hover:bg-green-200' : 'bg-red-100 border-red-200 group-hover:bg-red-200'}`}>
                                    <AvatarFallback className={tx.type === 'IN' ? 'text-green-700' : 'text-red-700'}>
                                        {tx.type === 'IN' ? <Banknote className="h-4 w-4" /> : getCategoryIcon(tx.category)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1 flex-1">
                                    <p className="text-sm font-medium leading-none truncate pr-2">
                                        {tx.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-semibold text-primary/80">{tx.user?.name || 'Usuario'}</span>
                                        <span>•</span>
                                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                                        {tx.method && (
                                            <>
                                                <span>•</span>
                                                <span>{tx.method}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={`ml-auto font-bold tabular-nums whitespace-nowrap ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'IN' ? '+' : '-'} S/ {Number(tx.amount).toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL (DASHBOARD) ---

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Estado de Datos Reales
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        junta: 0
    });

    // Función para cerrar sesión
    const handleLogout = async () => {
        // Limpiar cookie httpOnly via API
        await fetch('/api/auth/logout', { method: 'POST' });
        // Limpiar localStorage
        localStorage.removeItem('yunta-user-id');
        localStorage.removeItem('yunta-user-name');
        localStorage.removeItem('yunta-user-role');
        // Redirigir al login
        router.push('/');
    };

    useEffect(() => {
        // 1. Cargar Usuario
        if (typeof window !== 'undefined') {
            // Intentamos obtener perfil seleccionado, si no, uno por defecto
            const storedUser = localStorage.getItem('yunta-user-name');
            const storedRole = localStorage.getItem('yunta-user-role');
            setUser(storedUser || 'Familia');
            setUserRole(storedRole);
        }

        // 2. Cargar Datos de API
        const fetchData = async () => {
            try {
                // Obtener userId del localStorage
                const userId = localStorage.getItem('yunta-user-id');
                if (!userId) {
                    console.warn('No userId found, skipping transaction fetch');
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/transactions?userId=${userId}&limit=50`);
                const data = await res.json();

                const list: Transaction[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.transactions)
                        ? data.transactions
                        : Array.isArray(data?.data)
                            ? data.data
                            : [];

                if (list.length > 0) {
                    setTransactions(list);

                    // Calcular Totales
                    const inc = list.filter((t) => t.type === 'IN').reduce((a, b) => a + Number(b.amount), 0);
                    const exp = list.filter((t) => t.type === 'OUT').reduce((a, b) => a + Number(b.amount), 0);

                    setSummary({
                        totalIncome: inc,
                        totalExpenses: exp,
                        balance: inc - exp,
                        junta: 0
                    });
                }
            } catch (e) {
                console.error("Error cargando datos:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 md:grid-cols-4">
                    <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-64" /><Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {user} 👋</h1>
                    <p className="text-muted-foreground">Aquí está tu resumen financiero al momento.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button asChild className="flex-1 sm:flex-none h-11 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                        <Link href="/dashboard/transactions/new">
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Nuevo Movimiento
                        </Link>
                    </Button>
                    {(userRole === 'EJECUTIVO' || userRole === 'GESTOR') && (
                        <Button asChild variant="outline" className="flex-1 sm:flex-none h-11 border-primary/20 hover:bg-primary/5 text-primary">
                            <Link href="/dashboard/junta">
                                <Users className="mr-2 h-5 w-5" />
                                Ver Junta
                            </Link>
                        </Button>
                    )}
                    {userRole === 'EJECUTIVO' && (
                        <Button asChild variant="outline" className="flex-1 sm:flex-none h-11 border-amber-200 hover:bg-amber-50 text-amber-700">
                            <Link href="/dashboard/admin/users">
                                <Shield className="mr-2 h-5 w-5" />
                                Admin
                            </Link>
                        </Button>
                    )}
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="h-11 px-3 border-red-200 hover:bg-red-50 hover:text-red-600 text-red-500"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>



            {/* Tarjetas de Resumen */}
            <SummaryCards data={summary} />

            {/* Gráficos y Lista */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12 h-full">
                <div className="col-span-full lg:col-span-8 flex flex-col gap-6">
                    <CashFlowChart transactions={transactions} />
                    <SpendingChart transactions={transactions} />
                </div>
                <div className="col-span-full lg:col-span-4 h-full min-h-[500px]">
                    <TransactionList transactions={transactions} />
                </div>
            </div>
        </div>
    );
}
