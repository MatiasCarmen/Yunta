'use client';

import React from 'react';
import { List, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TransactionListProps {
    transactions: any[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(amount);
};

export function TransactionList({ transactions }: TransactionListProps) {

    const handleDelete = async (id: string) => {
        // Usamos window.confirm nativo por simplicidad, igual que en el plan original
        if (window.confirm('¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.')) {
            try {
                const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    window.location.reload();
                } else {
                    alert('Hubo un error al eliminar la transacción');
                }
            } catch (error) {
                console.error(error);
                alert('Error de conexión');
            }
        }
    };

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <List className="h-5 w-5" /> Transacciones Recientes
                </CardTitle>
                <CardDescription>Historial de ingresos y gastos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[350px] overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                            <TableRow>
                                <TableHead className="w-[100px]">Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <TableRow key={t.id} className="group">
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(t.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{t.description}</span>
                                                {/* Mobile only category */}
                                                <span className="md:hidden text-xs text-muted-foreground mt-0.5">{t.category || (t.type === 'IN' ? 'Ingreso' : 'General')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant="secondary" className="font-normal text-xs">{t.category || (t.type === 'IN' ? 'Ingreso' : 'General')}</Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold tabular-nums ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'IN' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(t.id)}
                                                title="Eliminar transacción"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span>No hay movimientos registrados.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
