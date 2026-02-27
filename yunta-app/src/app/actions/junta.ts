'use server';

import { prisma } from '@/database/client';
import { revalidatePath } from 'next/cache';
import { Prisma, $Enums, CuentaDestino } from '@prisma/client';
import { addDays, differenceInCalendarDays, startOfDay, startOfToday } from 'date-fns';
import { requireRole } from '@/lib/auth';

// --- TYPES TO MATCH FRONTEND ---

export type PaymentMethod = $Enums.PaymentMethod;

export type PaymentDestination = $Enums.CuentaDestino;

export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination?: CuentaDestino | null;
    notes?: string;
    clientTxId?: string;
};

export type JuntaState = {
    id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    participants: {
        id: string;
        name: string;
        dailyCommitment: number;
    }[];
    schedule: {
        date: string;
        beneficiaryId: string | null;
        isClosed: boolean;
    }[];
    ledger: {
        id: string;
        createdAt: string;
        createdBy: string;
        targetDate: string;
        participantId: string;
        amount: number;
        method: PaymentMethod;
        destination: string | null;
        notes: string | null;
        isCorrection: boolean;
        clientTxId?: string | null;
        cajaTransactionId?: string | null;
    }[];
    dateRange: {
        from: string;
        to: string;
    };
};

export type KardexDay = {
    date: string;
    dayNumber: number;
    expected: number;
    paid: number;
    balanceAfter: number;
    status: 'COMPLETED' | 'PARTIAL' | 'MISSING' | 'FUTURE';
    transactions: Array<{
        id: string;
        amount: number;
        method: PaymentMethod;
        destination: string | null;
        notes: string | null;
        paidAt: string;
        clientTxId?: string | null;
        cajaTransactionId?: string | null;
    }>;
};

export type KardexStats = {
    totalPaid: number;
    totalExpectedUntilToday: number;
    complianceRate: number;
    globalDebt: number;
    nextTurnDate: string | null;
};

export type KardexReport = {
    participantId: string;
    participantName: string;
    days: KardexDay[];
    stats: KardexStats;
    trend: Array<{ date: string; balance: number }>;
};

type CreateJuntaInput = {
    participants: Array<{
        id: string;
        name: string;
        dailyCommitment: number;
    }>;
    dateRange: {
        from: string;
        to: string;
    };
    schedule: Array<{
        date: string;
        beneficiaryId: string | null;
    }>;
};

// --- ACTIONS ---

export async function createJunta(data: CreateJuntaInput) {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        console.log("Creating Junta...", data);

        // 1. Get Admin (Assuming first executive found or fallback)
        const adminUser = await prisma.user.findFirst({ where: { role: 'EJECUTIVO' } });
        if (!adminUser) throw new Error("No Admin User found.");

        const result = await prisma.$transaction(async (tx) => {

            // A. Create Junta
            const newJunta = await tx.junta.create({
                data: {
                    name: "Junta Familiar " + new Date().getFullYear(),
                    startDate: new Date(data.dateRange.from),
                    amount: new Prisma.Decimal(0),
                    duration: data.schedule.length,
                    adminId: adminUser.id,
                    status: 'ACTIVE'
                }
            });

            // B. Create Shares with Commitment
            const shareMap = new Map<string, string>(); // FrontendID -> DB_ID

            for (const p of data.participants) {
                const share = await tx.juntaShare.create({
                    data: {
                        juntaId: newJunta.id,
                        guestName: p.name,
                        committedAmount: new Prisma.Decimal(p.dailyCommitment)
                    }
                });
                shareMap.set(p.id, share.id);
            }

            // C. Create Turns
            let turnIndex = 1;
            for (const day of data.schedule) {
                // Determine beneficiary share ID
                const shareId = day.beneficiaryId ? shareMap.get(day.beneficiaryId) : null;

                // If checking random/unassigned in frontend, handle here.
                // Assuming all days have beneficiary as validated by frontend
                if (shareId) {
                    await tx.juntaTurn.create({
                        data: {
                            juntaId: newJunta.id,
                            turnNumber: turnIndex++,
                            date: new Date(day.date),
                            beneficiaryId: shareId,
                            expectedAmount: new Prisma.Decimal(0), // Can calculate total pot here if needed
                            status: 'PENDING'
                        }
                    });
                }
            }

            return newJunta;
        });

        revalidatePath('/dashboard/junta');
        return { success: true, id: result.id };

    } catch (error) {
        console.error("Error creating Junta:", error);
        return { success: false, error: String(error) };
    }
}

export async function getActiveJunta() {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        const juntaDB = await prisma.junta.findFirst({
            where: { status: 'ACTIVE' },
            include: {
                shares: true,
                turns: {
                    include: {
                        beneficiary: true,
                        payments: true
                    },
                    orderBy: { date: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!juntaDB) return null;

        // Transform to Frontend State
        const participants = juntaDB.shares.map(s => ({
            id: s.id,
            name: s.guestName || "Sin Nombre",
            dailyCommitment: Number(s.committedAmount)
        }));

        const schedule = juntaDB.turns.map(t => ({
            date: t.date.toISOString().split('T')[0], // YYYY-MM-DD
            beneficiaryId: t.beneficiaryId,
            isClosed: t.isClosed
        }));

        // Flatten all payments into a single Ledger array
        const ledger = [];
        const paymentIds: string[] = [];

        for (const turn of juntaDB.turns) {
            for (const p of turn.payments) {
                paymentIds.push(p.id);
                ledger.push({
                    id: p.id,
                    createdAt: p.createdAt.toISOString(),
                    createdBy: 'ADMIN',
                    targetDate: turn.date.toISOString().split('T')[0], // Payment matches Turn Date
                    participantId: p.shareId, // shareId is the participant ID here
                    amount: Number(p.amount),
                    method: p.method,
                    destination: p.destination || CuentaDestino.EFECTIVO,
                    notes: p.notes || '',
                    isCorrection: false,
                    clientTxId: p.clientTxId,
                    cajaTransactionId: null as string | null
                });
            }
        }

        // Fetch CajaTransactions to link traceability
        if (paymentIds.length > 0) {
            const cajaTxs = await prisma.cajaTransaction.findMany({
                where: { juntaPaymentId: { in: paymentIds } },
                select: { id: true, juntaPaymentId: true }
            });
            const cajaTxsMap = new Map(cajaTxs.map(tx => [tx.juntaPaymentId, tx.id]));
            for (const l of ledger) {
                if (cajaTxsMap.has(l.id)) {
                    l.cajaTransactionId = cajaTxsMap.get(l.id) || null;
                }
            }
        }

        const status: JuntaState['status'] = juntaDB.status === 'ACTIVE' || juntaDB.status === 'COMPLETED' || juntaDB.status === 'CANCELLED'
            ? juntaDB.status
            : 'ACTIVE';

        return {
            id: juntaDB.id,
            status,
            participants,
            schedule,
            ledger,
            dateRange: {
                from: juntaDB.startDate.toISOString(),
                to: new Date(juntaDB.startDate.getTime() + (juntaDB.duration * 24 * 60 * 60 * 1000)).toISOString() // approx end
            }
        };

    } catch (error) {
        console.error("Error fetching Junta:", error);
        return null;
    }
}

export async function recordPayment(juntaId: string, txData: TransactionInput) {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        if (txData.clientTxId) {
            const existing = await prisma.juntaPayment.findUnique({
                where: { clientTxId: txData.clientTxId }
            });
            if (existing) {
                return { success: true, idempotent: true, message: "Sincronizado previamente (Idempotencia)" };
            }
        }

        const targetDate = new Date(txData.targetDate);
        const turn = await prisma.juntaTurn.findFirst({
            where: {
                juntaId: juntaId,
                date: targetDate
            }
        });

        if (!turn) throw new Error("No turn found for this date.");
        if (turn.isClosed) throw new Error("Este turno ya está cerrado.");

        await prisma.$transaction(async (tx) => {
            const payment = await tx.juntaPayment.create({
                data: {
                    turnId: turn.id,
                    shareId: txData.participantId,
                    amount: new Prisma.Decimal(txData.amount),
                    method: txData.method,
                    destination: txData.destination,
                    notes: txData.notes,
                    clientTxId: txData.clientTxId
                }
            });

            if (txData.destination && txData.destination !== 'NONE' as any) {
                // Ensure CajaAccount exists for the selected destination
                const cuenta = await tx.cajaAccount.upsert({
                    where: { tipoCuenta: txData.destination },
                    update: { saldoActual: { increment: new Prisma.Decimal(txData.amount) } },
                    create: {
                        tipoCuenta: txData.destination,
                        saldoActual: new Prisma.Decimal(txData.amount),
                        umbralAlerta: new Prisma.Decimal(100)
                    }
                });

                if (cuenta) {
                    await tx.cajaTransaction.create({
                        data: {
                            tipo: 'INGRESO',
                            monto: new Prisma.Decimal(txData.amount),
                            descripcion: `Cobro de Junta (Turno ${turn.turnNumber})`,
                            juntaPaymentId: payment.id,
                            cuentaDestinoId: cuenta.id,
                            fecha: new Date()
                        }
                    });
                }
            }
        });

        revalidatePath('/dashboard/junta');
        return { success: true };

    } catch (error: any) {
        console.error("Error recording payment:", error);

        // Handle Prisma unique constraint violation (P2002) for race conditions
        if (error.code === 'P2002' && error.meta?.target?.includes('clientTxId')) {
            console.log("Idempotency caught via unique constraint.");
            return { success: true, idempotent: true, message: "Sincronizado previamente (Idempotencia via DB)" };
        }

        return { success: false, error: String(error) };
    }
}

export async function closeDay(juntaId: string, date: string) {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        const targetDate = new Date(date);
        const turn = await prisma.juntaTurn.findFirst({
            where: { juntaId, date: targetDate },
            include: { payments: true }
        });

        if (!turn) throw new Error("Turno no encontrado para esta fecha.");

        // Determinar snapshot: montos del día
        const totalCollected = turn.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const totalExpected = Number(turn.expectedAmount);

        const participantsSnapshot = turn.payments.map(p => ({
            shareId: p.shareId,
            amount: Number(p.amount),
            id: p.id,
            method: p.method,
            destination: p.destination,
            notes: p.notes,
            paidAt: p.paidAt.toISOString(),
            clientTxId: p.clientTxId
        }));

        const snapshot = {
            expected: totalExpected,
            collected: totalCollected,
            diff: totalExpected - totalCollected,
            participants: participantsSnapshot,
            format: 'v1'
        };

        if (turn.isClosed) {
            // Reopen day
            await prisma.juntaTurn.update({
                where: { id: turn.id },
                data: { isClosed: false }
            });
        } else {
            // Close day
            await prisma.juntaTurn.update({
                where: { id: turn.id },
                data: {
                    isClosed: true,
                    closedAt: new Date(),
                    snapshotJson: JSON.stringify(snapshot)
                }
            });
        }

        revalidatePath('/dashboard/junta');
        return { success: true };
    } catch (error) {
        console.error("Error closing day:", error);
        return { success: false, error: String(error) };
    }
}

export async function getParticipantKardex(juntaId: string, participantId: string): Promise<KardexReport | null> {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        const juntaDB = await prisma.junta.findFirst({
            where: { id: juntaId, status: 'ACTIVE' },
            include: {
                shares: true,
                turns: {
                    include: { payments: true },
                    orderBy: { date: 'asc' }
                }
            }
        });

        if (!juntaDB) return null;

        const participantShare = juntaDB.shares.find(s => s.id === participantId);
        if (!participantShare) return null;

        const shareCommitment = Number(participantShare.committedAmount);
        const today = startOfToday();
        const scheduleStart = startOfDay(juntaDB.startDate);

        const turnByDate = new Map<string, typeof juntaDB.turns[number]>();
        const allPaymentIds: string[] = [];
        for (const turn of juntaDB.turns) {
            const key = turn.date.toISOString().split('T')[0];
            turnByDate.set(key, turn);
            allPaymentIds.push(...turn.payments.map(p => p.id));
        }

        const cajaTxsMap = new Map<string, string>();
        if (allPaymentIds.length > 0) {
            const cajaTxs = await prisma.cajaTransaction.findMany({
                where: { juntaPaymentId: { in: allPaymentIds } },
                select: { id: true, juntaPaymentId: true }
            });
            for (const tx of cajaTxs) {
                if (tx.juntaPaymentId) cajaTxsMap.set(tx.juntaPaymentId, tx.id);
            }
        }

        let cumulativeBalance = 0;
        let perfectDays = 0;
        let daysConsidered = 0;
        let totalPaid = 0;
        let totalExpected = 0;
        let globalDebt = 0;

        const days: KardexDay[] = [];

        for (let i = 0; i < juntaDB.duration; i++) {
            const currentDate = addDays(scheduleStart, i);
            const dateKey = currentDate.toISOString().split('T')[0];
            const isFuture = differenceInCalendarDays(currentDate, today) > 0;
            const turn = turnByDate.get(dateKey);

            let dayPayments = turn?.payments.filter(p => p.shareId === participantShare.id) ?? [];
            let isFromSnapshot = false;

            if (turn?.isClosed && turn.snapshotJson) {
                try {
                    const snap = JSON.parse(turn.snapshotJson);
                    if (snap.format === 'v1' && snap.participants) {
                        const snapP = snap.participants.filter((sp: any) => sp.shareId === participantShare.id);
                        dayPayments = snapP.map((sp: any) => ({
                            id: sp.id || Math.random().toString(),
                            amount: sp.amount,
                            method: sp.method || 'CASH',
                            destination: sp.destination || null,
                            notes: sp.notes || null,
                            paidAt: sp.paidAt ? new Date(sp.paidAt) : addDays(scheduleStart, i),
                            clientTxId: sp.clientTxId || null
                        })) as any;
                        isFromSnapshot = true;
                    }
                } catch (e) {
                    console.error("Failed parsing snapshot", e);
                }
            }

            const paid = dayPayments.reduce((acc, p) => acc + Number(p.amount), 0);
            const expected = shareCommitment;
            const diff = expected - paid;

            let status: KardexDay['status'] = 'MISSING';
            if (isFuture) status = 'FUTURE';
            else if (paid >= expected) {
                status = 'COMPLETED';
                perfectDays++;
            } else if (paid > 0) {
                status = 'PARTIAL';
            }

            if (!isFuture) {
                daysConsidered++;
                totalExpected += expected;
                if (diff > 0) globalDebt += diff;
            }

            totalPaid += paid;
            cumulativeBalance += paid - expected;

            days.push({
                date: dateKey,
                dayNumber: i + 1,
                expected,
                paid,
                balanceAfter: Number(cumulativeBalance.toFixed(2)),
                status,
                transactions: dayPayments.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    method: p.method,
                    destination: p.destination,
                    notes: p.notes,
                    paidAt: p.paidAt.toISOString(),
                    clientTxId: p.clientTxId,
                    cajaTransactionId: cajaTxsMap.get(p.id) || null
                }))
            });
        }

        const complianceRate = daysConsidered === 0 ? 0 : Math.round((perfectDays / daysConsidered) * 100);
        const nextTurn = juntaDB.turns.find(turn => turn.beneficiaryId === participantShare.id && differenceInCalendarDays(turn.date, today) >= 0);

        const trend = days.map(day => ({ date: day.date, balance: day.balanceAfter }));

        return {
            participantId: participantShare.id,
            participantName: participantShare.guestName || 'Sin Nombre',
            days,
            stats: {
                totalPaid,
                totalExpectedUntilToday: totalExpected,
                complianceRate,
                globalDebt: Number(globalDebt.toFixed(2)),
                nextTurnDate: nextTurn ? nextTurn.date.toISOString().split('T')[0] : null
            },
            trend
        };
    } catch (error) {
        console.error('Error fetching kardex:', error);
        return null;
    }
}

export async function rescheduleTurn(juntaId: string, date: string, newBeneficiaryId: string) {
    try {
        await requireRole(['EJECUTIVO', 'GESTOR']);
        const targetDate = new Date(date);
        const turn = await prisma.juntaTurn.findFirst({
            where: { juntaId, date: targetDate }
        });

        if (!turn) throw new Error("Turno no encontrado.");
        if (turn.isClosed) throw new Error("No se puede cambiar un día cerrado.");

        // Need the Share ID (DB ID) corresponding to the Beneficiary ID (could be Frontend ID if mismatched, but we assume DB ID)
        // Here we assume newBeneficiaryId passed from frontend is the DB ID (JuntaShare ID)

        await prisma.juntaTurn.update({
            where: { id: turn.id },
            data: { beneficiaryId: newBeneficiaryId }
        });

        revalidatePath('/dashboard/junta');
        return { success: true };
    } catch (error) {
        console.error("Error rescheduling:", error);
        return { success: false, error: String(error) };
    }
}
