'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

// Dashboard components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsRow from '@/components/dashboard/StatsRow';
import CashflowChartCard from '@/components/dashboard/CashflowChartCard';
import RecentTransactionsCard from '@/components/dashboard/RecentTransactionsCard';
import ExpenseAnalysisCard from '@/components/dashboard/ExpenseAnalysisCard';
import PlaceholderBudgetCard from '@/components/dashboard/PlaceholderBudgetCard';
import PlaceholderGoalsCard from '@/components/dashboard/PlaceholderGoalsCard';

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

// --- COMPONENTE PRINCIPAL (DASHBOARD) ---

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Estado de Datos Reales
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        junta: 0,
    });

    // Filtro global de búsqueda
    const filteredTransactions = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(
            (t) =>
                t.description.toLowerCase().includes(q) ||
                t.category?.toLowerCase().includes(q) ||
                t.method?.toLowerCase().includes(q) ||
                t.user?.name.toLowerCase().includes(q)
        );
    }, [transactions, searchQuery]);

    // Función para cerrar sesión
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('yunta-user-id');
        localStorage.removeItem('yunta-user-name');
        localStorage.removeItem('yunta-user-role');
        router.push('/');
    };

    useEffect(() => {
        // 1. Cargar Usuario
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('yunta-user-name');
            const storedRole = localStorage.getItem('yunta-user-role');
            setUser(storedUser || 'Familia');
            setUserRole(storedRole);
        }

        // 2. Cargar Datos de API
        const fetchData = async () => {
            try {
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

                    const inc = list.filter((t) => t.type === 'IN').reduce((a, b) => a + Number(b.amount), 0);
                    const exp = list.filter((t) => t.type === 'OUT').reduce((a, b) => a + Number(b.amount), 0);

                    setSummary({
                        totalIncome: inc,
                        totalExpenses: exp,
                        balance: inc - exp,
                        junta: 0,
                    });
                }
            } catch (e) {
                console.error('Error cargando datos:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Loading skeleton ---
    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <div className="grid gap-4 lg:grid-cols-12">
                    <Skeleton className="h-72 lg:col-span-8" />
                    <Skeleton className="h-72 lg:col-span-4" />
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
            {/* ─── Topbar ─── */}
            <DashboardHeader
                userName={user}
                userRole={userRole}
                onLogout={handleLogout}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* ─── Stats Row (4 cards) ─── */}
            <StatsRow data={summary} />

            {/* ─── Main Grid: Chart + Transactions ─── */}
            <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <CashflowChartCard transactions={filteredTransactions} />
                </div>
                <div className="lg:col-span-4">
                    <RecentTransactionsCard transactions={filteredTransactions} />
                </div>
            </div>

            {/* ─── Bottom Row: Analysis + Budget + Goals ─── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ExpenseAnalysisCard transactions={filteredTransactions} />
                <PlaceholderBudgetCard transactions={filteredTransactions} />
                <PlaceholderGoalsCard />
            </div>
        </div>
    );
}
