import fs from 'fs';

const p = 'src/app/actions/junta.ts';
let d = fs.readFileSync(p, 'utf8');

// Update closeDay participantsSnapshot to include full tx
const closeDaySearch = `        const participantsSnapshot = turn.payments.map(p => ({
            shareId: p.shareId,
            amount: Number(p.amount)
        }));`;

const closeDayReplace = `        const participantsSnapshot = turn.payments.map(p => ({
            shareId: p.shareId,
            amount: Number(p.amount),
            id: p.id,
            method: p.method,
            destination: p.destination,
            notes: p.notes,
            paidAt: p.paidAt.toISOString(),
            clientTxId: p.clientTxId
        }));`;

d = d.replace(closeDaySearch, closeDayReplace);

// Update getParticipantKardex 
const kardexSearch = `            const dayPayments = turn?.payments.filter(p => p.shareId === participantShare.id) ?? [];
            const paid = dayPayments.reduce((acc, p) => acc + Number(p.amount), 0);
            const expected = shareCommitment;
            const diff = expected - paid;`;

const kardexReplace = `            let dayPayments = turn?.payments.filter(p => p.shareId === participantShare.id) ?? [];
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
            const diff = expected - paid;`;

d = d.replace(kardexSearch, kardexReplace);

fs.writeFileSync(p, d);
console.log('Successfully patched junta.ts for snapshot reliance in kardex');
