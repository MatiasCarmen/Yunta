// ============================================
// YUNTA - Sync Service (Client)
// ============================================
// Servicio para sincronizar datos locales con el backend
// ============================================

import { localDb } from '@/database/local';

/**
 * Sincroniza juntas pendientes con el servidor
 */
export async function syncMeetings(userId: string) {
    try {
        // 1. Obtener juntas no sincronizadas (synced = 0)
        const pendingMeetings = await localDb.meetings
            .where('synced')
            .equals(0)
            .toArray();

        if (pendingMeetings.length === 0) {
            return { success: true, count: 0, message: 'Nada que sincronizar' };
        }

        // 2. Enviar al servidor
        const response = await fetch('/api/meetings/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                meetings: pendingMeetings
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en el servidor');
        }

        // 3. Marcar como sincronizadas localmente
        // Iteramos sobre las que enviamos para actualizar su estado
        // Usamos bulkPut o iteración. Dexie soporta bulk update.

        // O mejor, actualizamos una por una para estar seguros, o todas si fue exito total
        const ids = pendingMeetings.map(m => m.id as number);

        await localDb.meetings
            .where('id')
            .anyOf(ids)
            .modify({ synced: 1 });

        return {
            success: true,
            count: ids.length,
            message: `Sincronizadas ${ids.length} juntas`
        };

    } catch (error: any) {
        console.error('Error en syncMeetings:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
