'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

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
    Loader2
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

// --- COMPONENTE: ASESOR IA GEMINI ---
function AIAdvisor({ summary, transactions }: { summary: any, transactions: Transaction[] }) {
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getFinancialAdvice = async () => {
        setLoading(true);
        try {
            // Preparamos los datos para que sean legibles por la IA (limitamos transacciones para no saturar prompt)
            const recentTx = transactions.slice(0, 10).map(t => ({
                desc: t.description,
                amount: t.amount,
                type: t.type,
                cat: t.category
            }));

            const prompt = `
        Actúa como un asesor financiero personal experto y amigable (tono "bro" pero profesional).
        Analiza estos datos de mi familia hoy:
        - Balance: ${JSON.stringify(summary)}
        - Últimos movimientos: ${JSON.stringify(recentTx)}
        
        Dame 3 puntos clave con emojis:
        1. Análisis rápido (¿bien o mal?).
        2. Alerta de gasto hormiga o innecesario si ves uno.
        3. Consejo breve para la "Junta" (ahorro).
        
        Máximo 3 párrafos cortos.
      `;

            // API Key desde variable de entorno o placeholder
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

            if (!apiKey) {
                setAdvice("¡Ups! Necesito una API Key de Gemini para pensar. Configura NEXT_PUBLIC_GEMINI_API_KEY en tu .env");
                return;
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                }
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                setAdvice(text);
            } else {
                setAdvice("Lo siento, bro. Mis neuronas están descansando. Intenta luego.");
            }
        } catch (error) {
            console.error("Error IA:", error);
            setAdvice("Error de conexión con el cerebro. Revisa tu internet.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="col-span-full bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-indigo-700 text-xl">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Asesor Financiero IA
                    </CardTitle>
                    <CardDescription className="text-indigo-600/80">
                        Analiza tus finanzas en tiempo real con Inteligencia Artificial.
                    </CardDescription>
                </div>
                <Button
                    onClick={getFinancialAdvice}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105 w-full sm:w-auto"
                >
                    {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Pensando...</>
                    ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> ✨ Analizar</>
                    )}
                </Button>
            </CardHeader>

            {advice && (
                <CardContent className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-indigo-100 text-indigo-900 text-sm leading-relaxed whitespace-pre-line shadow-inner">
                        {advice}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

// --- SUB-COMPONENTES CONECTADOS ---

function SummaryCards({ data }: { data: any }) {
    // Calculamos la Junta (Asumiendo que usamos la regla 300 semanal)
    // En el futuro esto vendrá de la DB real de 'Meetings' o 'Goals'
    const juntaGoal = 300;
    // Simulamos progreso de junta basado en un % del balance o un valor fijo por ahora
    const juntaCurrent = data.junta || 0;
    const isGoalMet = juntaCurrent >= juntaGoal;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <Card className="shadow-sm border-l-4 border-l-purple-500 bg-purple-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Junta Semanal</CardTitle>
                    <CreditCard className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-purple-700">S/ {juntaCurrent.toFixed(2)}</div>
                    <p className="text-xs text-purple-600/80 mt-1">
                        Meta: S/ {juntaGoal} {isGoalMet ? '(✅)' : '(⏳)'}
                    </p>
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
    const [user, setUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Estado de Datos Reales
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        junta: 0
    });

    useEffect(() => {
        // 1. Cargar Usuario
        if (typeof window !== 'undefined') {
            // Intentamos obtener perfil seleccionado, si no, uno por defecto
            const storedUser = localStorage.getItem('yunta-user-name');
            setUser(storedUser || 'Familia');
        }

        // 2. Cargar Datos de API
        const fetchData = async () => {
            try {
                const res = await fetch('/api/transactions?limit=50');
                const data = await res.json();

                if (data && (data.data || Array.isArray(data))) {
                    const list = Array.isArray(data) ? data : data.data;
                    setTransactions(list);

                    // Calcular Totales
                    const inc = list.filter((t: any) => t.type === 'IN').reduce((a: number, b: any) => a + Number(b.amount), 0);
                    const exp = list.filter((t: any) => t.type === 'OUT').reduce((a: number, b: any) => a + Number(b.amount), 0);

                    // Calcular Junta (Suma de categoría RESERVATION_FUNDS)
                    const junta = list
                        .filter((t: any) => t.type === 'OUT' && t.category === 'RESERVATION_FUNDS')
                        .reduce((a: number, b: any) => a + Number(b.amount), 0);

                    setSummary({
                        totalIncome: inc,
                        totalExpenses: exp,
                        balance: inc - exp,
                        junta: junta
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
                    <Button variant="outline" className="flex-1 sm:flex-none h-11 border-primary/20 hover:bg-primary/5 text-primary">
                        <Users className="mr-2 h-5 w-5" />
                        Ver Junta
                    </Button>
                </div>
            </div>

            {/* IA Advisor */}
            <AIAdvisor summary={summary} transactions={transactions} />

            {/* Tarjetas de Resumen */}
            <SummaryCards data={summary} />

            {/* Gráficos y Lista */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                <div className="col-span-full lg:col-span-4 h-full">
                    <SpendingChart transactions={transactions} />
                </div>
                <div className="col-span-full lg:col-span-3 h-full">
                    <TransactionList transactions={transactions} />
                </div>
            </div>
        </div>
    );
}
