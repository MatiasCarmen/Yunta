import fs from 'fs';

const p = 'src/app/actions/junta.ts';
let d = fs.readFileSync(p, 'utf8');

const targetLoop = `        // Flatten all payments into a single Ledger array
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
                    destination: p.destination || CuentaDestino.EFECTIVO,
                    notes: p.notes || '',
                    isCorrection: false
                });
            }
        }`;

const replacementLoop = `        // Flatten all payments into a single Ledger array
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
        }`;

if (d.includes(targetLoop)) {
    d = d.replace(targetLoop, replacementLoop);
    fs.writeFileSync(p, d);
    console.log('Successfully patched junta.ts loop');
} else {
    console.error('Target loop not found');
}
