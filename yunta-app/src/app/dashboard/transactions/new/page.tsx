'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';

// Definimos las opciones basadas en el Schema de Prisma
const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'DEBIT', label: 'Tarjeta de Débito' },
    { value: 'CREDIT_BCP', label: 'BCP Visa Dorada' },
    { value: 'YAPE', label: 'Yape' },
];

const EXPENSE_CATEGORIES = [
    { value: 'FOOD', label: 'Comida/Alimentos' },
    { value: 'MOBILITY', label: 'Transporte/Movilidad' },
    { value: 'SHOPPING', label: 'Compras Generales' },
    { value: 'ERRANDS', label: 'Encargos' },
    { value: 'MERCHANDISE', label: 'Mercadería' },
    { value: 'HEALTH', label: 'Salud y Medicinas' },
    { value: 'EDUCATION', label: 'Educación' },
    { value: 'ENTERTAINMENT', label: 'Entretenimiento' },
    { value: 'UTILITIES', label: 'Servicios' },
    { value: 'OTHER', label: 'Otros' },
    { value: 'PAYROLL', label: 'Pago Personal' },
];

export default function NewTransactionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'IN' | 'OUT'>('OUT');

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        method: 'YAPE',
        category: 'FOOD',
        notes: '',
        date: new Date().toISOString().split('T')[0] // Default today YYYY-MM-DD
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Preparar payload
            // Nota: userId temporalmente hardcodeado o enviado si la API lo requiere.
            // Asumimos que la API tomas el userId del contexto o espera uno.
            // Si la API falla, agregaremos un selector de usuario.
            const payload = {
                ...formData,
                amount: Number(formData.amount),
                type,
                // Si es INGRESO, category es opcional o null
                category: type === 'IN' ? undefined : formData.category,
                // TODO: Obtener userId real. Por ahora usamos un ID dummy o dejamos que la API falle si requiere auth.
                // Idealmente, este formulario debería estar en un contexto de usuario autenticado.
            };

            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al guardar');
            }

            // Éxito
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la transacción. Asegúrate de tener usuarios creados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center items-start">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
                            <Link href="/dashboard">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <CardTitle>Registrar Movimiento</CardTitle>
                    </div>
                    <CardDescription>
                        Ingresa los detalles financieros. La regla 300/50 se aplicará automáticamente a los ingresos.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">

                        {/* Selector de Tipo (Tabs Visuales) */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                            <button
                                type="button"
                                onClick={() => setType('IN')}
                                className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${type === 'IN'
                                        ? 'bg-background text-green-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-muted-foreground hover:bg-background/50'
                                    }`}
                            >
                                Ingreso (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('OUT')}
                                className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${type === 'OUT'
                                        ? 'bg-background text-red-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-muted-foreground hover:bg-background/50'
                                    }`}
                            >
                                Gasto (-)
                            </button>
                        </div>

                        {/* Monto y Fecha */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Monto (S/)</Label>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                    min="0.01"
                                    className="text-lg font-semibold"
                                    value={formData.amount}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Fecha</Label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder={type === 'IN' ? "Ej: Pago semanal librería" : "Ej: Compra supermercado"}
                                required
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Método de Pago y Categoría */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="method">Método de Pago</Label>
                                <div className="relative">
                                    <select
                                        id="method"
                                        name="method"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                        value={formData.method}
                                        onChange={handleChange}
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    {/* Flechita custom para que se vea bien */}
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {type === 'OUT' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <Label htmlFor="category">Categoría</Label>
                                    <div className="relative">
                                        <select
                                            id="category"
                                            name="category"
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                            value={formData.category}
                                            onChange={handleChange}
                                        >
                                            {EXPENSE_CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (Opcional)</Label>
                            <textarea
                                id="notes"
                                name="notes"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Detalles adicionales..."
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 bg-muted/20 p-6">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/dashboard">Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={loading} className={type === 'IN' ? 'bg-green-600 hover:bg-green-700' : ''}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Guardar Transacción
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
