// ============================================
// YUNTA - Meeting Sync Service
// ============================================
// Servicio para sincronizar juntas locales (Dexie)
// con la nube (Supabase/Prisma)
// ============================================

import { localDb } from '@/database/local';
import type { LocalMeeting } from '@/database/local';

// ============================================
// TIPOS
// ============================================

export interface SyncResult {
    success: boolean;
    syncedCount: number;
    errors: Array<{ localId?: number; error: string }>;
}

// ============================================
// FUNCIONES DE SINCRONIZACIÓN
// ============================================

/**
 * Sincroniza todas las juntas pendientes con el servidor
 */
export async function syncPendingMeetings(userId: string): Promise<SyncResult> {
    try {
        // 1. Obtener juntas pendientes (synced = 0)
        const pendingMeetings = await localDb.meetings
            .where('synced')
            .equals(0)
            .toArray();

        if (pendingMeetings.length === 0) {
            return {
                success: true,
                syncedCount: 0,
                errors: [],
            };
        }

        console.log(`📤 Sincronizando ${pendingMeetings.length} juntas...`);

        const errors: Array<{ localId?: number; error: string }> = [];
        let syncedCount = 0;

        // 2. Sincronizar cada junta individualmente
        for (const meeting of pendingMeetings) {
            try {
                // Enviar al servidor
                const response = await fetch('/api/meetings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: meeting.title,
                        date: meeting.date,
                        content: meeting.content,
                        agreements: meeting.agreements,
                        participants: meeting.participants,
                        userId,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    // 3. Marcar como sincronizado en Dexie
                    await localDb.meetings.update(meeting.id!, {
                        synced: 1,
                    });

                    syncedCount++;
                    console.log(`✅ Junta "${meeting.title}" sincronizada`);
                } else {
                    throw new Error(data.message || 'Error desconocido');
                }
            } catch (error: any) {
                console.error(`❌ Error sincronizando junta ${meeting.id}:`, error);
                errors.push({
                    localId: meeting.id,
                    error: error.message,
                });
            }
        }

        return {
            success: errors.length === 0,
            syncedCount,
            errors,
        };
    } catch (error: any) {
        console.error('❌ Error general en sincronización:', error);
        return {
            success: false,
            syncedCount: 0,
            errors: [{ error: error.message }],
        };
    }
}

/**
 * Verifica si hay juntas pendientes de sincronizar
 */
export async function hasPendingMeetings(): Promise<boolean> {
    const count = await localDb.meetings.where('synced').equals(0).count();
    return count > 0;
}

/**
 * Obtiene el conteo de juntas pendientes
 */
export async function getPendingMeetingsCount(): Promise<number> {
    return await localDb.meetings.where('synced').equals(0).count();
}

/**
 * Obtiene todas las juntas (locales y sincronizadas)
 */
export async function getAllLocalMeetings(): Promise<LocalMeeting[]> {
    return await localDb.meetings.orderBy('date').reverse().toArray();
}

/**
 * Elimina una junta local
 */
export async function deleteLocalMeeting(id: number): Promise<void> {
    await localDb.meetings.delete(id);
}

/**
 * Verifica el estado de conexión
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Hook para suscribirse a cambios de conectividad
 */
export function subscribeToOnlineStatus(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retornar función de limpieza
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}
