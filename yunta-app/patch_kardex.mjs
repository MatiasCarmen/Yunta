import fs from 'fs';

const p = 'src/app/actions/junta.ts';
let d = fs.readFileSync(p, 'utf8');

const targetStr = `        const turnByDate = new Map<string, typeof juntaDB.turns[number]>();
        for (const turn of juntaDB.turns) {
            const key = turn.date.toISOString().split('T')[0];
            turnByDate.set(key, turn);
        }`;

const replacementStr = `        const turnByDate = new Map<string, typeof juntaDB.turns[number]>();
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
        }`;

d = d.replace(targetStr, replacementStr);

const transactionsLoop = `                transactions: dayPayments.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    method: p.method,
                    destination: p.destination,
                    notes: p.notes,
                    paidAt: p.paidAt.toISOString()
                }))`;

const transactionsReplacement = `                transactions: dayPayments.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    method: p.method,
                    destination: p.destination,
                    notes: p.notes,
                    paidAt: p.paidAt.toISOString(),
                    clientTxId: p.clientTxId,
                    cajaTransactionId: cajaTxsMap.get(p.id) || null
                }))`;

d = d.replace(transactionsLoop, transactionsReplacement);

fs.writeFileSync(p, d);
console.log('Successfully patched getParticipantKardex');
