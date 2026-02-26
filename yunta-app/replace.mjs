import fs from 'fs';

const p = 'src/app/actions/junta.ts';
let d = fs.readFileSync(p, 'utf8');

// 1. TransactionInput
d = d.replace(
    `export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination: PaymentDestination;
    notes?: string;
};`,
    `export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination: PaymentDestination;
    notes?: string;
    clientTxId?: string;
};`
);

// 2. recordPayment
d = d.replace(
    `export async function recordPayment(juntaId: string, txData: TransactionInput) {
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
                method: txData.method,
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
}`,
    `export async function recordPayment(juntaId: string, txData: TransactionInput) {
    try {
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
                const cuenta = await tx.cajaAccount.findUnique({
                    where: { tipoCuenta: txData.destination }
                });
                
                if (cuenta) {
                    await tx.cajaAccount.update({
                        where: { id: cuenta.id },
                        data: { saldoActual: { increment: new Prisma.Decimal(txData.amount) } }
                    });
                    await tx.cajaTransaction.create({
                        data: {
                            tipo: 'INGRESO',
                            monto: new Prisma.Decimal(txData.amount),
                            descripcion: \`Cobro de Junta (Turno \${turn.turnNumber})\`,
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

    } catch (error) {
        console.error("Error recording payment:", error);
        return { success: false, error: String(error) };
    }
}`
);

// 3. closeDay
d = d.replace(
    `export async function closeDay(juntaId: string, date: string) {
    try {
        const targetDate = new Date(date);
        const turn = await prisma.juntaTurn.findFirst({
            where: { juntaId, date: targetDate }
        });

        if (!turn) throw new Error("Turno no encontrado para esta fecha.");

        await prisma.juntaTurn.update({
            where: { id: turn.id },
            data: { isClosed: true }
        });

        revalidatePath('/dashboard/junta');
        return { success: true };
    } catch (error) {
        console.error("Error closing day:", error);
        return { success: false, error: String(error) };
    }
}`,
    `export async function closeDay(juntaId: string, date: string) {
    try {
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
            amount: Number(p.amount)
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
}`
);

fs.writeFileSync(p, d);
console.log("Updated junta.ts successfully");
