import Dexie, { type Table } from 'dexie';
import type { TransactionInput } from '@/app/actions/junta';

// ============================================
// INTERFACES LOCALES
// ============================================

export interface PendingPayment {
    id?: number;
    clientTxId: string;
    payload: TransactionInput;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    attempts: number;
    lastError?: string;
    createdAt: Date;
}

export interface LocalMeeting {
    id?: number;
    title: string;
    participants: string[];
    content: string;
    agreements: string;
    date: Date;
    synced: number;
}

// ============================================
// CONFIGURACIÓN DE DEXIE
// ============================================

export class YuntaLocalDB extends Dexie {
    pendingPayments!: Table<PendingPayment>;
    meetings!: Table<LocalMeeting>;

    constructor() {
        super('YuntaLocalDB');

        // Increment version to 3 to add pendingPayments
        this.version(3).stores({
            pendingPayments: '++id, clientTxId, status',
            meetings: '++id, title, date, synced'
        });
    }
}

export const localDb = new YuntaLocalDB();

// ============================================
// PENDING PAYMENTS (OFFLINE QUEUE)
// ============================================

export async function enqueuePendingPayment(payload: TransactionInput) {
    if (!payload.clientTxId) throw new Error("clientTxId required for offline queue");
    try {
        await localDb.pendingPayments.add({
            clientTxId: payload.clientTxId,
            payload,
            status: 'PENDING',
            attempts: 0,
            createdAt: new Date(),
        });
        return true;
    } catch (error) {
        console.error('Error enqueuing payment offline:', error);
        return false;
    }
}

export async function getPendingPayments() {
    return await localDb.pendingPayments
        .where('status')
        .equals('PENDING')
        .toArray();
}

export async function markPendingFailed(id: number, error: string) {
    const record = await localDb.pendingPayments.get(id);
    if (record) {
        const attempts = record.attempts + 1;
        const status = attempts >= 5 ? 'FAILED' : 'PENDING';
        await localDb.pendingPayments.update(id, {
            status,
            attempts,
            lastError: String(error)
        });
    }
}

export async function deletePending(id: number) {
    await localDb.pendingPayments.delete(id);
}
