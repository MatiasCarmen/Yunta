'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    Banknote,
    ShoppingCart,
    Utensils,
    Bus,
    Package,
    ArrowUpDown,
    Filter,
} from 'lucide-react';

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

interface RecentTransactionsCardProps {
    transactions: Transaction[];
}

const getCategoryIcon = (cat?: string) => {
    if (!cat) return <ShoppingCart className="h-3.5 w-3.5" />;
    const c = cat.toUpperCase();
    if (c.includes('COMIDA') || c === 'FOOD') return <Utensils className="h-3.5 w-3.5" />;
    if (c.includes('MOVILIDAD') || c === 'MOBILITY') return <Bus className="h-3.5 w-3.5" />;
    if (c.includes('MERCADERIA') || c === 'MERCHANDISE') return <Package className="h-3.5 w-3.5" />;
    return <ShoppingCart className="h-3.5 w-3.5" />;
};

const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const m = method.toUpperCase();
    let variant: 'default' | 'secondary' | 'outline' = 'secondary';
    if (m.includes('EFECTIVO') || m.includes('CASH')) variant = 'outline';
    if (m.includes('YAPE') || m.includes('PLIN')) variant = 'default';
    return (
        <Badge variant={variant} className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {method}
        </Badge>
    );
};

export default function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
    const [localSearch, setLocalSearch] = useState('');
    const [sortAsc, setSortAsc] = useState(false);
    const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [filterMethod, setFilterMethod] = useState<string[]>([]);
    const [filterCategory, setFilterCategory] = useState<string[]>([]);

    // Extract unique methods and categories
    const uniqueMethods = useMemo(() => {
        const methods = new Set<string>();
        transactions.forEach((t) => {
            if (t.method) methods.add(t.method);
        });
        return Array.from(methods).sort();
    }, [transactions]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set<string>();
        transactions.forEach((t) => {
            if (t.category) categories.add(t.category);
        });
        return Array.from(categories).sort();
    }, [transactions]);

    const filtered = useMemo(() => {
        let list = [...transactions];

        // Apply type filter
        if (filterType !== 'ALL') {
            list = list.filter((t) => t.type === filterType);
        }

        // Apply method filter
        if (filterMethod.length > 0) {
            list = list.filter((t) => t.method && filterMethod.includes(t.method));
        }

        // Apply category filter
        if (filterCategory.length > 0) {
            list = list.filter((t) => t.category && filterCategory.includes(t.category));
        }

        // Apply search filter
        if (localSearch.trim()) {
            const q = localSearch.toLowerCase();
            list = list.filter(
                (t) =>
                    t.description.toLowerCase().includes(q) ||
                    t.category?.toLowerCase().includes(q) ||
                    t.method?.toLowerCase().includes(q)
            );
        }

        // Apply sorting
        if (sortAsc) {
            list.sort((a, b) => Number(a.amount) - Number(b.amount));
        }

        return list;
    }, [transactions, localSearch, sortAsc, filterType, filterMethod, filterCategory]);

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Últimos Movimientos</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            {transactions.length} transacciones
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSortAsc(!sortAsc)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            title={sortAsc ? 'Orden original' : 'Ordenar por monto'}
                        >
                            <ArrowUpDown className={`h-3.5 w-3.5 ${sortAsc ? 'text-primary' : 'text-muted-foreground'}`} />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                    title="Filtros"
                                >
                                    <Filter className={`h-3.5 w-3.5 ${
                                        filterType !== 'ALL' || filterMethod.length > 0 || filterCategory.length > 0
                                            ? 'text-primary'
                                            : 'text-muted-foreground'
                                    }`} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Tipo</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem
                                    checked={filterType === 'ALL'}
                                    onCheckedChange={() => setFilterType('ALL')}
                                >
                                    Todos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterType === 'IN'}
                                    onCheckedChange={() => setFilterType('IN')}
                                >
                                    Ingresos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterType === 'OUT'}
                                    onCheckedChange={() => setFilterType('OUT')}
                                >
                                    Egresos
                                </DropdownMenuCheckboxItem>

                                {uniqueMethods.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Método</DropdownMenuLabel>
                                        {uniqueMethods.map((method) => (
                                            <DropdownMenuCheckboxItem
                                                key={method}
                                                checked={filterMethod.includes(method)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFilterMethod([...filterMethod, method]);
                                                    } else {
                                                        setFilterMethod(filterMethod.filter((m) => m !== method));
                                                    }
                                                }}
                                            >
                                                {method}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </>
                                )}

                                {uniqueCategories.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Categoría</DropdownMenuLabel>
                                        {uniqueCategories.map((category) => (
                                            <DropdownMenuCheckboxItem
                                                key={category}
                                                checked={filterCategory.includes(category)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFilterCategory([...filterCategory, category]);
                                                    } else {
                                                        setFilterCategory(filterCategory.filter((c) => c !== category));
                                                    }
                                                }}
                                            >
                                                {category}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </>
                                )}

                                {(filterType !== 'ALL' || filterMethod.length > 0 || filterCategory.length > 0) && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <button
                                            onClick={() => {
                                                setFilterType('ALL');
                                                setFilterMethod([]);
                                                setFilterCategory([]);
                                            }}
                                            className="w-full px-2 py-1.5 text-xs text-center text-primary hover:bg-muted rounded-sm"
                                        >
                                            Limpiar filtros
                                        </button>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {/* Búsqueda interna */}
                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar por descripción..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="pl-8 h-8 text-xs bg-muted/30 border-border/50"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {localSearch ? 'Sin resultados para esta búsqueda.' : 'Sin movimientos recientes.'}
                        </div>
                    ) : (
                        filtered.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                                <Avatar
                                    className={`h-8 w-8 border shrink-0 transition-colors ${
                                        tx.type === 'IN'
                                            ? 'bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100'
                                            : 'bg-red-50 border-red-200 group-hover:bg-red-100'
                                    }`}
                                >
                                    <AvatarFallback
                                        className={
                                            tx.type === 'IN' ? 'text-emerald-700' : 'text-red-700'
                                        }
                                    >
                                        {tx.type === 'IN' ? (
                                            <Banknote className="h-3.5 w-3.5" />
                                        ) : (
                                            getCategoryIcon(tx.category)
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight truncate">
                                        {tx.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(tx.date).toLocaleDateString('es-PE', {
                                                day: '2-digit',
                                                month: 'short',
                                            })}
                                        </span>
                                        {tx.method && getMethodBadge(tx.method)}
                                    </div>
                                </div>
                                <span
                                    className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                                        tx.type === 'IN' ? 'text-emerald-600' : 'text-red-600'
                                    }`}
                                >
                                    {tx.type === 'IN' ? '+' : '-'}S/{Number(tx.amount).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
