'use client';

import React, { useState } from 'react';
import { X, FileBarChart, TrendingUp, PieChart, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportTab = 'resumen' | 'categorias' | 'tendencias' | 'exportar';

export default function ReportsDrawer({ isOpen, onClose }: ReportsDrawerProps) {
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
          {activeTab === 'resumen' && <ResumenContent />}
          {activeTab === 'categorias' && <CategoriasContent />}
          {activeTab === 'tendencias' && <TendenciasContent />}
          {activeTab === 'exportar' && <ExportarContent />}
        </div>
      </div>
    </div>
  );
}

function ResumenContent() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen General</CardTitle>
          <CardDescription>Vista consolidada de tu situación financiera</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <div className="text-center">
              <FileBarChart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Próximamente</p>
              <p className="text-xs text-slate-400 mt-1">Reportes consolidados y análisis avanzado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriasContent() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis por Categoría</CardTitle>
          <CardDescription>Desglose detallado de ingresos y gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Próximamente</p>
              <p className="text-xs text-slate-400 mt-1">Análisis categórico avanzado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TendenciasContent() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendencias y Proyecciones</CardTitle>
          <CardDescription>Análisis temporal y predicciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Próximamente</p>
              <p className="text-xs text-slate-400 mt-1">Análisis de tendencias y proyecciones</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportarContent() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Reportes</CardTitle>
          <CardDescription>Descarga tus datos en diferentes formatos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            <Download className="w-4 h-4 mr-2" />
            Exportar como PDF
            <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Download className="w-4 h-4 mr-2" />
            Exportar como Excel
            <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Download className="w-4 h-4 mr-2" />
            Exportar datos completos (ZIP)
            <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
