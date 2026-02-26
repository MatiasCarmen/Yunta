import { useEffect } from 'react';
import { getPendingPayments, deletePending, enqueuePendingPayment, markPendingFailed } from '@/database/local';
import { recordPayment } from '@/app/actions/junta';

export function useJuntaSync(juntaId: string, onSyncComplete?: () => void) {
    useEffect(() => {
        const handleSync = async () => {
            // Check network status before trying
            if (!navigator.onLine) return;

            try {
                const pendings = await getPendingPayments();
                if (pendings.length === 0) return;

                let syncedCount = 0;
                for (const tx of pendings) {
                    try {
                        const res = await recordPayment(juntaId, tx.payload);
                        if (res.success) {
                            await deletePending(tx.id!);
                            syncedCount++;
                        } else {
                            // Logic validation error or DB error
                            const errMsg = res.error || 'Unknown error';
                            // If it's a closed turn or idempotency handles it by success=true
                            await markPendingFailed(tx.id!, errMsg);
                        }
                    } catch (e) {
                        // Failsafe catch for network errors during call
                        await markPendingFailed(tx.id!, String(e));
                    }
                }

                if (syncedCount > 0 && onSyncComplete) {
                    onSyncComplete();
                }
            } catch (err) {
                console.error("Sync worker error:", err);
            }
        };

        window.addEventListener('online', handleSync);
        // Initial attempt on mount if online
        if (navigator.onLine) {
            handleSync();
        }

        return () => window.removeEventListener('online', handleSync);
    }, [juntaId, onSyncComplete]);
}
