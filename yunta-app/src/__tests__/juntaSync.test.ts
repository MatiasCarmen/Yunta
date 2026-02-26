import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordPayment, closeDay } from '../app/actions/junta';
import { enqueuePendingPayment, getPendingPayments, markPendingFailed, deletePending, localDb } from '../database/local';
import { prisma } from '../database/client';

// Mock DB
vi.mock('../database/client', () => {
    return {
        prisma: {
            juntaPayment: { findUnique: vi.fn(), create: vi.fn() },
            juntaTurn: { findFirst: vi.fn(), update: vi.fn() },
            $transaction: vi.fn((fn) => fn(prisma)),
            cajaAccount: { findUnique: vi.fn(), update: vi.fn() },
            cajaTransaction: { create: vi.fn() }
        }
    };
});

describe('Junta Sync & Financiamiento', () => {

    beforeEach(async () => {
        vi.clearAllMocks();
        // Clear dexie
        await localDb.pendingPayments.clear();
    });

    it('1. Idempotencia: 2 llamadas con mismo clientTxId crean 1 pago', async () => {
        (prisma.juntaPayment.findUnique as any).mockResolvedValueOnce({ id: 'existing_pmt' });

        const res = await recordPayment('test-junta', {
            targetDate: '2023-10-10', participantId: 'user1', amount: 100, method: 'YAPE', destination: 'YAPE_ADMIN', clientTxId: 'txn-123'
        });

        expect(res.success).toBe(true);
        expect((res as any).idempotent).toBe(true);
        expect(prisma.juntaPayment.create).not.toHaveBeenCalled();
    });

    it('2. Idempotencia: falla por Unique Constraint en Prisma', async () => {
        (prisma.juntaPayment.findUnique as any).mockResolvedValueOnce(null);
        (prisma.juntaTurn.findFirst as any).mockResolvedValueOnce({ id: 'turn1', isClosed: false });
        // Simular P2002 fallando en transaccion
        (prisma.$transaction as any).mockRejectedValueOnce({
            code: 'P2002',
            meta: { target: ['clientTxId'] }
        });

        const res = await recordPayment('test-junta', {
            targetDate: '2023-10-10', participantId: 'user1', amount: 100, method: 'YAPE', destination: 'YAPE_ADMIN', clientTxId: 'txn-race'
        });

        expect(res.success).toBe(true);
        expect((res as any).idempotent).toBe(true);
    });

    it('3. Turno cerrado: recordPayment rechaza', async () => {
        (prisma.juntaPayment.findUnique as any).mockResolvedValueOnce(null);
        (prisma.juntaTurn.findFirst as any).mockResolvedValueOnce({ id: 'turn1', isClosed: true });

        const res = await recordPayment('test-junta', {
            targetDate: '2023-10-10', participantId: 'user1', amount: 100, method: 'YAPE', destination: 'YAPE_ADMIN', clientTxId: 'txn-125'
        });

        expect(res.success).toBe(false);
        expect(res.error).toMatch(/cerrado/);
        expect(prisma.juntaPayment.create).not.toHaveBeenCalled();
    });

    it('4. Offline enqueue/getPendingPayments work correctly with Dexie', async () => {
        const payload = { targetDate: '2023-10-10', participantId: 'user1', amount: 50, method: 'YAPE' as any, destination: 'YAPE_ADMIN' as any, clientTxId: 'off-1' };

        await enqueuePendingPayment(payload);
        const records = await getPendingPayments();

        expect(records.length).toBe(1);
        expect(records[0].clientTxId).toBe('off-1');
        expect(records[0].status).toBe('PENDING');

        // Test delete doesn't crash
        await deletePending(records[0].id!);
        const remaining = await getPendingPayments();
        expect(remaining.length).toBe(0);
    });

    it('5. Fallback a FAILED despues de 5 intentos', async () => {
        const payload = { targetDate: '2023-10-10', participantId: 'user1', amount: 50, method: 'YAPE' as any, destination: 'YAPE_ADMIN' as any, clientTxId: 'off-failed' };
        await enqueuePendingPayment(payload);
        const pendings = await getPendingPayments();
        const id = pendings[0].id!;

        for (let i = 0; i < 5; i++) {
            await markPendingFailed(id, 'Error simulado');
        }

        const checkAgain = await localDb.pendingPayments.get(id);
        expect(checkAgain?.status).toBe('FAILED');
    });

    it('6. Snapshot closeDay: genera snapshotJson coherente al cerrar un día', async () => {
        const mockTurn = {
            id: 'turn-999',
            expectedAmount: 200,
            isClosed: false,
            payments: [
                { shareId: 'user1', amount: 100 },
                { shareId: 'user2', amount: 50 }, // Total = 150
            ]
        };
        (prisma.juntaTurn.findFirst as any).mockResolvedValueOnce(mockTurn);

        await closeDay('test-junta', '2023-10-10');

        expect(prisma.juntaTurn.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                isClosed: true,
                snapshotJson: expect.any(String)
            })
        }));

        const updateCall = (prisma.juntaTurn.update as any).mock.calls[0][0];
        const snapshot = JSON.parse(updateCall.data.snapshotJson);

        expect(snapshot.expected).toBe(200);
        expect(snapshot.collected).toBe(150);
        expect(snapshot.diff).toBe(50);
    });
});
