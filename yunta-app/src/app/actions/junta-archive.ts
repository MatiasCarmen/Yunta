'use server';

import { prisma } from '@/database/client';
import { revalidatePath } from 'next/cache';
import { startOfDay, differenceInCalendarDays } from 'date-fns';

// ============================================
// TIPOS PARA ARCHIVO DE JUNTAS
// ============================================

export type ArchivedJuntaSummary = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    participantCount: number;
    totalCollected: number;
    totalExpected: number;
    complianceRate: number;
    archivedAt: string;
    archiveReason: string | null;
};

export type ParticipantFinalReport = {
    id: string;
    name: string;
    dailyCommitment: number;
    totalPaid: number;
    totalExpected: number;
    complianceRate: number;
    finalDebt: number;
    turnsReceived: number[];
};

export type JuntaFinalReport = {
    juntaId: string;
    juntaName: string;
    period: {
        start: string;
        end: string;
        totalDays: number;
    };
    participants: ParticipantFinalReport[];
    globalStats: {
        totalCollected: number;
        totalExpected: number;
        globalCompliance: number;
        totalDebt: number;
        participantCount: number;
    };
    timeline: Array<{
        date: string;
        event: string;
    }>;
    archivedAt: string;
    archiveReason: string | null;
};

// ============================================
// ACCIONES DE ARCHIVO
// ============================================

/**
 * Archiva una junta activa generando un reporte final completo
 */
export async function archiveJunta(juntaId: string, reason?: string) {
    try {
        // 1. Obtener junta con todas sus relaciones
        const junta = await prisma.junta.findUnique({
            where: { id: juntaId },
            include: {
                shares: {
                    include: {
                        user: true,
                        turns: {
                            include: {
                                payments: true
                            }
                        }
                    }
                },
                turns: {
                    include: {
                        beneficiary: true,
                        payments: true
                    }
                }
            }
        });

        if (!junta) {
            throw new Error('Junta no encontrada');
        }

        if (junta.status !== 'ACTIVE') {
            throw new Error('Solo se pueden archivar juntas activas');
        }

        // 2. Calcular estadísticas finales
        const startDate = startOfDay(junta.startDate);
        const endDate = startOfDay(new Date());
        const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

        // Calcular estadísticas por participante
        const participants: ParticipantFinalReport[] = junta.shares.map(share => {
            const name = share.user?.name || share.guestName || 'Sin nombre';
            const dailyCommitment = Number(share.committedAmount);
            const totalExpected = dailyCommitment * totalDays;

            // Calcular total pagado por este participante
            const allPayments = junta.turns.flatMap(turn =>
                turn.payments.filter(p => p.shareId === share.id)
            );
            const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

            // Calcular días completos
            const paymentsByDate = new Map<string, number>();
            allPayments.forEach(payment => {
                const dateKey = payment.paidAt.toISOString().split('T')[0];
                paymentsByDate.set(dateKey, (paymentsByDate.get(dateKey) || 0) + Number(payment.amount));
            });

            let completeDays = 0;
            for (let i = 0; i < totalDays; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                const paidForDay = paymentsByDate.get(dateKey) || 0;
                if (paidForDay >= dailyCommitment) {
                    completeDays++;
                }
            }

            const complianceRate = totalDays > 0 ? (completeDays / totalDays) * 100 : 0;
            const finalDebt = totalPaid - totalExpected;

            // Turnos que recibió este participante
            const turnsReceived = share.turns
                .filter(t => t.status === 'PAID_OUT' || t.status === 'FUNDED')
                .map(t => t.turnNumber);

            return {
                id: share.id,
                name,
                dailyCommitment,
                totalPaid,
                totalExpected,
                complianceRate,
                finalDebt,
                turnsReceived
            };
        });

        // Calcular estadísticas globales
        const totalCollected = participants.reduce((sum, p) => sum + p.totalPaid, 0);
        const totalExpected = participants.reduce((sum, p) => sum + p.totalExpected, 0);
        const globalCompliance = participants.length > 0
            ? participants.reduce((sum, p) => sum + p.complianceRate, 0) / participants.length
            : 0;
        const totalDebt = totalCollected - totalExpected;

        // Generar timeline de eventos importantes
        const timeline: Array<{ date: string; event: string }> = [];

        // Agregar turnos entregados
        junta.turns
            .filter(t => t.status === 'PAID_OUT' || t.status === 'FUNDED')
            .forEach(turn => {
                const beneficiaryName = junta.shares.find(s => s.id === turn.beneficiaryId)?.user?.name
                    || junta.shares.find(s => s.id === turn.beneficiaryId)?.guestName
                    || 'Desconocido';
                timeline.push({
                    date: turn.date.toISOString().split('T')[0],
                    event: `Turno ${turn.turnNumber} entregado a ${beneficiaryName}`
                });
            });

        // Ordenar timeline por fecha
        timeline.sort((a, b) => a.date.localeCompare(b.date));

        // 3. Crear reporte final
        const finalReport: JuntaFinalReport = {
            juntaId: junta.id,
            juntaName: junta.name,
            period: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                totalDays
            },
            participants,
            globalStats: {
                totalCollected,
                totalExpected,
                globalCompliance,
                totalDebt,
                participantCount: participants.length
            },
            timeline,
            archivedAt: new Date().toISOString(),
            archiveReason: reason || null
        };

        // 4. Actualizar junta en base de datos
        await prisma.junta.update({
            where: { id: juntaId },
            data: {
                status: 'ARCHIVED',
                archivedAt: new Date(),
                endedAt: endDate,
                archiveReason: reason || null,
                finalReportJson: JSON.stringify(finalReport)
            }
        });

        revalidatePath('/dashboard/junta');
        revalidatePath('/dashboard/juntas/archivadas');

        return { success: true, report: finalReport };
    } catch (error) {
        console.error('Error archivando junta:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Obtiene lista de juntas archivadas
 */
export async function getArchivedJuntas(): Promise<ArchivedJuntaSummary[]> {
    try {
        const archived = await prisma.junta.findMany({
            where: {
                status: { in: ['ARCHIVED', 'COMPLETED', 'CANCELLED'] }
            },
            include: {
                shares: true
            },
            orderBy: {
                archivedAt: 'desc'
            }
        });

        return archived.map(junta => {
            const summary: ArchivedJuntaSummary = {
                id: junta.id,
                name: junta.name,
                startDate: junta.startDate.toISOString().split('T')[0],
                endDate: junta.endedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                participantCount: junta.shares.length,
                totalCollected: 0,
                totalExpected: 0,
                complianceRate: 0,
                archivedAt: junta.archivedAt?.toISOString() || junta.updatedAt.toISOString(),
                archiveReason: junta.archiveReason
            };

            // Si existe reporte JSON, extraer datos
            if (junta.finalReportJson) {
                try {
                    const report: JuntaFinalReport = JSON.parse(junta.finalReportJson);
                    summary.totalCollected = report.globalStats.totalCollected;
                    summary.totalExpected = report.globalStats.totalExpected;
                    summary.complianceRate = report.globalStats.globalCompliance;
                } catch (e) {
                    console.error('Error parseando reporte:', e);
                }
            }

            return summary;
        });
    } catch (error) {
        console.error('Error obteniendo juntas archivadas:', error);
        return [];
    }
}

/**
 * Obtiene el reporte completo de una junta archivada
 */
export async function getJuntaArchiveReport(juntaId: string): Promise<JuntaFinalReport | null> {
    try {
        const junta = await prisma.junta.findUnique({
            where: { id: juntaId }
        });

        if (!junta || !junta.finalReportJson) {
            return null;
        }

        return JSON.parse(junta.finalReportJson) as JuntaFinalReport;
    } catch (error) {
        console.error('Error obteniendo reporte archivado:', error);
        return null;
    }
}

/**
 * Duplica una junta archivada creando una nueva con la misma configuración
 */
export async function duplicateJunta(juntaId: string, newName: string, newStartDate: Date) {
    try {
        // Obtener junta original
        const originalJunta = await prisma.junta.findUnique({
            where: { id: juntaId },
            include: {
                shares: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (!originalJunta) {
            throw new Error('Junta no encontrada');
        }

        // Crear nueva junta
        const newJunta = await prisma.junta.create({
            data: {
                name: newName,
                description: originalJunta.description,
                startDate: newStartDate,
                amount: originalJunta.amount,
                currency: originalJunta.currency,
                frequency: originalJunta.frequency,
                duration: originalJunta.duration,
                status: 'ACTIVE',
                adminId: originalJunta.adminId,
                shares: {
                    create: originalJunta.shares.map(share => ({
                        userId: share.userId,
                        guestName: share.guestName,
                        committedAmount: share.committedAmount
                    }))
                }
            }
        });

        revalidatePath('/dashboard/junta');

        return { success: true, juntaId: newJunta.id };
    } catch (error) {
        console.error('Error duplicando junta:', error);
        return { success: false, error: String(error) };
    }
}
