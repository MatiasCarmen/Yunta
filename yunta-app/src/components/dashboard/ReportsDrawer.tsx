'use client';

import React, { useState, useMemo } from 'react';
import { X, FileBarChart, TrendingUp, PieChart, Download, BarChart3, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  junta: number;
}

interface ReportsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  summary: Summary;
}

type ReportTab = 'resumen' | 'categorias' | 'tendencias' | 'exportar';

export default function ReportsDrawer({ isOpen, onClose, transactions, summary }: ReportsDrawerProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('resumen');

  if (!isOpen) return null;

  const tabs = [
    { id: 'resumen' as ReportTab, label: 'Resumen', icon: BarChart3 },
    { id: 'categorias' as ReportTab, label: 'Categorías', icon: PieChart },
    { id: 'tendencias' as ReportTab, label: 'Tendencias', icon: TrendingUp },
    { id: 'exportar' as ReportTab, label: 'Exportar', icon: Download },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer/Panel */}
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileBarChart className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Reportes Avanzados</h2>
              <p className="text-xs text-slate-500">Análisis detallado de tus finanzas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'resumen' && <ResumenContent transactions={transactions} summary={summary} />}
          {activeTab === 'categorias' && <CategoriasContent transactions={transactions} />}
          {activeTab === 'tendencias' && <TendenciasContent transactions={transactions} />}
          {activeTab === 'exportar' && <ExportarContent transactions={transactions} />}
        </div>
      </div>
    </div>
  );
}

function ResumenContent({ transactions, summary }: { transactions: Transaction[]; summary: Summary }) {
  const transactionCount = transactions.length;
  const incomeCount = transactions.filter(t => t.type === 'IN').length;
  const expenseCount = transactions.filter(t => t.type === 'OUT').length;
  const averageTransaction = transactionCount > 0 ? summary.totalIncome + summary.totalExpenses / transactionCount : 0;

  return (
    <div className="space-y-4">
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-medium">Total Ingresos</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">S/ {summary.totalIncome.toFixed(2)}</p>
                <p className="text-xs text-emerald-600 mt-1">{incomeCount} transacciones</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <ArrowUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Total Gastos</p>
                <p className="text-2xl font-bold text-red-900 mt-1">S/ {summary.totalExpenses.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">{expenseCount} transacciones</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ArrowDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-indigo-700 font-medium">Balance</p>
              <p className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                S/ {summary.balance.toFixed(2)}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {summary.balance >= 0 ? 'Superávit' : 'Déficit'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-slate-700 font-medium">Total Movimientos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{transactionCount}</p>
              <p className="text-xs text-slate-600 mt-1">Promedio: S/ {averageTransaction.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalles del Período</CardTitle>
          <CardDescription>Información consolidada de tus finanzas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Ratio Ingreso/Gasto</span>
            <span className="text-sm font-semibold text-slate-900">
              {summary.totalExpenses > 0 ? ((summary.totalIncome / summary.totalExpenses) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Tasa de Ahorro</span>
            <span className="text-sm font-semibold text-slate-900">
              {summary.totalIncome > 0 ? ((summary.balance / summary.totalIncome) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">Transacción Promedio</span>
            <span className="text-sm font-semibold text-slate-900">S/ {averageTransaction.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriasContent({ transactions }: { transactions: Transaction[] }) {
  const categoryStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number; count: number }> = {};
    
    transactions.forEach(t => {
      const cat = t.category || 'Sin categoría';
      if (!stats[cat]) {
        stats[cat] = { income: 0, expense: 0, count: 0 };
      }
      if (t.type === 'IN') {
        stats[cat].income += Number(t.amount);
      } else {
        stats[cat].expense += Number(t.amount);
      }
      stats[cat].count += 1;
    });

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        ...data,
        total: data.expense + data.income,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalAmount = categoryStats.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis por Categoría</CardTitle>
          <CardDescription>Desglose de {categoryStats.length} categorías</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryStats.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay transacciones para analizar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryStats.map((cat, idx) => {
                const percentage = totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {cat.category}
                        </Badge>
                        <span className="text-xs text-slate-500">({cat.count} mov.)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">S/ {cat.total.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pl-1">
                      <span className="text-emerald-600">↑ S/ {cat.income.toFixed(2)}</span>
                      <span className="text-red-600">↓ S/ {cat.expense.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TendenciasContent({ transactions }: { transactions: Transaction[] }) {
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number; count: number }> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!stats[monthKey]) {
        stats[monthKey] = { income: 0, expense: 0, count: 0 };
      }
      
      if (t.type === 'IN') {
        stats[monthKey].income += Number(t.amount);
      } else {
        stats[monthKey].expense += Number(t.amount);
      }
      stats[monthKey].count += 1;
    });

    return Object.entries(stats)
      .map(([month, data]) => ({
        month,
        ...data,
        balance: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendencias Mensuales</CardTitle>
          <CardDescription>Análisis temporal de {monthlyStats.length} meses</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyStats.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay suficientes datos para mostrar tendencias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyStats.map((month, idx) => {
                const monthName = new Date(month.month + '-01').toLocaleDateString('es', {
                  year: 'numeric',
                  month: 'long',
                });
                return (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-900 capitalize">{monthName}</span>
                      </div>
                      <Badge 
                        variant={month.balance >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {month.balance >= 0 ? '+' : ''}S/ {month.balance.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Ingresos</p>
                        <p className="font-semibold text-emerald-600">S/ {month.income.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Gastos</p>
                        <p className="font-semibold text-red-600">S/ {month.expense.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Movimientos</p>
                        <p className="font-semibold text-slate-900">{month.count}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
          <CardDescription>Últimas {recentTransactions.length} transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTransactions.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-lg ${t.type === 'IN' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {t.type === 'IN' ? (
                      <ArrowUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${t.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'IN' ? '+' : '-'}S/ {Number(t.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportarContent({ transactions }: { transactions: Transaction[] }) {
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Monto', 'Descripción', 'Categoría', 'Método'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('es'),
      t.type === 'IN' ? 'INGRESO' : 'GASTO',
      Number(t.amount).toFixed(2),
      t.description,
      t.category || 'Sin categoría',
      t.method || 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacciones-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacciones-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Reportes</CardTitle>
          <CardDescription>Descarga tus datos en diferentes formatos ({transactions.length} transacciones)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar como CSV
            <span className="ml-auto text-xs text-muted-foreground">Excel compatible</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleExportJSON}
            disabled={transactions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar como JSON
            <span className="ml-auto text-xs text-muted-foreground">Para desarrolladores</span>
          </Button>
          
          {transactions.length === 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                No hay transacciones para exportar. Realiza algunas transacciones primero.
              </p>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Nota:</strong> Los archivos exportados incluyen todas las transacciones visibles ({transactions.length} registros).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
