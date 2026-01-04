'use server';

import { prisma } from '@/database/client';
import { revalidatePath } from 'next/cache';
import {
    Junta, JuntaShare, JuntaTurn, JuntaPayment, Prisma, $Enums
} from '@prisma/client';

// --- TYPES TO MATCH FRONTEND ---

export type PaymentMethod = $Enums.PaymentMethod;

export type PaymentDestination = 'CAJA_CHICA' | 'STHEFANY_BCP' | 'PILAR' | 'SEBASTIAN';

export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination: PaymentDestination;
    notes?: string;
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
    }[];
    dateRange: {
        from: string;
        to: string;
    };
};

// --- ACTIONS ---

export async function createJunta(data: any) {
    try {
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
            isClosed: false // TODO: Add isClosed field to Turn model if needed, or use status
        }));

        // Flatten all payments into a single Ledger array
        const ledger = [];
        for (const turn of juntaDB.turns) {
            for (const p of turn.payments) {
                ledger.push({
                    id: p.id,
                    createdAt: p.createdAt.toISOString(),
                    createdBy: 'ADMIN',
                    targetDate: turn.date.toISOString().split('T')[0], // Payment matches Turn Date
                    participantId: p.shareId, // shareId is the participant ID here
                    amount: Number(p.amount),
                    method: p.method,
                    destination: 'CAJA_CHICA', // TODO: Add destination to Schema?
                    notes: '', // TODO: Add notes to Schema?
                    isCorrection: false
                });
            }
        }

        return {
            id: juntaDB.id,
            status: juntaDB.status as any,
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
        // 1. Find the Turn corresponding to the Date
        const targetDate = new Date(txData.targetDate);
        const turn = await prisma.juntaTurn.findFirst({
            where: {
                juntaId: juntaId,
                date: targetDate
            }
        });

        if (!turn) throw new Error("No turn found for this date.");

        // 2. Create Payment
        await prisma.juntaPayment.create({
            data: {
                turnId: turn.id,
                shareId: txData.participantId,
                amount: new Prisma.Decimal(txData.amount),
                method: txData.method as any, // Cast to enum
                destination: txData.destination,
                notes: txData.notes
            }
        });

        revalidatePath('/dashboard/junta');
        return { success: true };

    } catch (error) {
        console.error("Error recording payment:", error);
        return { success: false, error: String(error) };
    }
}

export async function closeDay(juntaId: string, date: string) {
    try {
        const targetDate = new Date(date);
        const turn = await prisma.juntaTurn.findFirst({
            where: { juntaId, date: targetDate }
        });

        if (!turn) throw new Error("Turno no encontrado para esta fecha.");

        await prisma.juntaTurn.update({
            where: { id: turn.id },
            data: { isClosed: true } as any // Force cast to bypass TS error
        });

        revalidatePath('/dashboard/junta');
        return { success: true };
    } catch (error) {
        console.error("Error closing day:", error);
        return { success: false, error: String(error) };
    }
}

export async function rescheduleTurn(juntaId: string, date: string, newBeneficiaryId: string) {
    try {
        const targetDate = new Date(date);
        const turn = await prisma.juntaTurn.findFirst({
            where: { juntaId, date: targetDate }
        });

        if (!turn) throw new Error("Turno no encontrado.");
        if ((turn as any).isClosed) throw new Error("No se puede cambiar un día cerrado.");

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
