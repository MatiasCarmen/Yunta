'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar as CalendarIcon,
    PiggyBank,
    CheckCircle2,
    AlertCircle,
    Plus,
    ArrowRight,
    Wand2,
    Trash2,
    BarChart3
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// --- TYPES ---

interface Participant {
    id: string; // Temporarily internal ID or User ID
    name: string;
    shares: number; // Cantidad de cuotas
}

interface JuntaConfig {
    name: string;
    startDate: Date;
    amount: number; // Por cuota
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'; // Por ahora solo DAILY en UI v1
    duration: number; // Cantidad de turnos totales
}

// --- COMPONENT: WIZARD ---

export default function JuntaDashboard() {
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'WELCOME' | 'CREATE' | 'DASHBOARD'>('WELCOME');

    // Create Form State
    const [config, setConfig] = useState<JuntaConfig>({
        name: 'Junta Familiar 2026',
        startDate: new Date(),
        amount: 300,
        frequency: 'DAILY',
        duration: 10
    });

    const [participants, setParticipants] = useState<Participant[]>([
        { id: '1', name: 'Tomás', shares: 1 },
        { id: '2', name: 'Pilar', shares: 1 },
    ]);

    // Dashboard Data (Mock inicial, luego conectamos a API)
    const [activeJunta, setActiveJunta] = useState<any>(null);

    // --- ACTIONS ---

    const handleAddParticipant = () => {
        setParticipants([...participants, { id: Date.now().toString(), name: '', shares: 1 }]);
    };

    const handleUpdateParticipant = (index: number, field: keyof Participant, value: any) => {
        const updated = [...participants];
        updated[index] = { ...updated[index], [field]: value };
        setParticipants(updated);
    };

    const handleRemoveParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index));
    };

    const handleCreateJunta = async () => {
        // Simular creación por ahora para mostrar la UI
        setLoading(true);
        setTimeout(() => {
            const totalShares = participants.reduce((acc, p) => acc + p.shares, 0);
            // Auto-ajustar duración si es necesario o validar

            setActiveJunta({
                ...config,
                participants,
                totalShares,
                turns: generateTurns(config, participants)
            });
            setView('DASHBOARD');
            setLoading(false);
        }, 1000);
    };

    // --- LOGIC ---

    const generateTurns = (cfg: JuntaConfig, parts: Participant[]) => {
        // Crear pool de beneficiarios basado en shares
        let pool: string[] = [];
        parts.forEach(p => {
            for (let i = 0; i < p.shares; i++) pool.push(p.name);
        });

        // Mezclar (Shuffle)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Generar fechas (simple daily)
        return pool.map((name, idx) => ({
            turn: idx + 1,
            date: addDays(cfg.startDate, idx),
            beneficiary: name,
            status: 'PENDING', // PENDING, COMPLETED
            collected: 0,
            target: (pool.length - 1) * cfg.amount // Todos pagan menos el beneficiario (depende la regla)
            // Regla estándar: Todos pagan, beneficiario recibe TODO.
            // O: Beneficiario NO paga su turno.
            // Asumiremos: TODOS aportan al pozo, y el pozo se entrega.
        }));
    };

    // --- VIEWS ---

    if (view === 'WELCOME') {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in">
                <div className="bg-indigo-100 p-6 rounded-full">
                    <PiggyBank className="h-16 w-16 text-indigo-600" />
                </div>
                <div className="max-w-lg">
                    <h1 className="text-3xl font-bold text-foreground">Sistema de Juntas</h1>
                    <p className="text-muted-foreground mt-4 text-lg">
                        Organiza el ahorro colectivo de tu familia con confianza auditada.
                        Controla turnos, pagos y fechas de entrega con precisión financiera.
                    </p>
                </div>
                <Button size="lg" onClick={() => setView('CREATE')} className="gap-2 shadow-lg hover:scale-105 transition-all">
                    <Plus className="h-5 w-5" /> Crear Nueva Junta
                </Button>
            </div>
        );
    }

    if (view === 'CREATE') {
        return (
            <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Configuración de Junta</h2>
                    <Button variant="ghost" onClick={() => setView('WELCOME')}>Cancelar</Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Reglas del Juego</CardTitle>
                        <CardDescription>Define los parámetros básicos del contrato.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Nombre de la Junta</Label>
                            <Input
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Inicio</Label>
                                <Input
                                    type="date"
                                    value={format(config.startDate, 'yyyy-MM-dd')}
                                    onChange={(e) => setConfig({ ...config, startDate: new Date(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cuota (S/)</Label>
                                <Input
                                    type="number"
                                    value={config.amount}
                                    onChange={(e) => setConfig({ ...config, amount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frecuencia</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                                    value={config.frequency}
                                    onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
                                >
                                    <option value="DAILY">Diaria (Todos los días)</option>
                                    <option value="WEEKLY">Semanal (Cada Lunes)</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Participantes</CardTitle>
                            <CardDescription>¿Quiénes entran y con cuántos cupos?</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleAddParticipant}><Plus className="h-4 w-4 mr-2" /> Agregar</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {participants.map((p, idx) => (
                            <div key={idx} className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Nombre</Label>
                                    <Input
                                        value={p.name}
                                        onChange={(e) => handleUpdateParticipant(idx, 'name', e.target.value)}
                                        placeholder="Ej: Tía María"
                                    />
                                </div>
                                <div className="w-24 space-y-2">
                                    <Label>Cupos</Label>
                                    <Input
                                        type="number" min="1"
                                        value={p.shares}
                                        onChange={(e) => handleUpdateParticipant(idx, 'shares', Number(e.target.value))}
                                    />
                                </div>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleRemoveParticipant(idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="bg-muted/20 border-t p-4 flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                            Total Cupos: <strong>{participants.reduce((a, b) => a + b.shares, 0)}</strong>
                            <span className="mx-2">•</span>
                            Pozo Diario: <strong>S/ {(participants.reduce((a, b) => a + b.shares, 0) * config.amount).toFixed(2)}</strong>
                        </div>
                        <Button onClick={handleCreateJunta} disabled={loading} className="w-40">
                            {loading ? <Wand2 className="h-4 w-4 animate-spin" /> : <>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></>}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // --- DASHBOARD VIEW ---

    if (view === 'DASHBOARD' && activeJunta) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <PiggyBank className="text-indigo-600" /> {activeJunta.name}
                        </h1>
                        <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">Estado: ACTIVO</Badge>
                            <span>•</span>
                            <span>Inicio: {format(activeJunta.startDate, 'dd MMM yyyy', { locale: es })}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><BarChart3 className="h-4 w-4 mr-2" /> Reporte</Button>
                        <Button variant="destructive" onClick={() => setView('WELCOME')}>Cerrar Junta</Button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-muted-foreground">Pozo por Turno</div>
                            <div className="text-3xl font-bold text-indigo-600">S/ {(activeJunta.totalShares * activeJunta.amount).toFixed(2)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-muted-foreground">Progreso</div>
                            <div className="text-3xl font-bold">0 / {activeJunta.turns.length}</div>
                            <p className="text-xs text-muted-foreground">turnos pagados</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-muted-foreground">Deuda Acumulada</div>
                            <div className="text-3xl font-bold text-green-600">S/ 0.00</div>
                            <p className="text-xs text-muted-foreground">¡Todo en orden!</p>
                        </CardContent>
                    </Card>
                </div>

                {/* CALENDARIO DE TURNOS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Calendario de Turnos</CardTitle>
                        <CardDescription>Programación oficial de pagos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activeJunta.turns.map((turn: any) => (
                                <div key={turn.turn} className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-100 text-indigo-700 rounded-lg font-bold">
                                            <span className="text-xs uppercase">{format(turn.date, 'MMM', { locale: es })}</span>
                                            <span className="text-xl">{format(turn.date, 'dd')}</span>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-lg">Turno #{turn.turn}: {turn.beneficiary}</div>
                                            <div className="text-sm text-muted-foreground">Recibe S/ {(activeJunta.totalShares * activeJunta.amount).toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto justify-between">
                                        <div className="text-right mr-4">
                                            <div className="text-sm font-medium text-orange-600 flex items-center gap-1 justify-end">
                                                <AlertCircle className="h-3 w-3" /> Recaudación Pendiente
                                            </div>
                                            <div className="text-xs text-muted-foreground">0/{activeJunta.participants.length} pagaron</div>
                                        </div>
                                        <Button>Registrar Cobros</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
