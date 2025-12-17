'use client';

// ============================================
// YUNTA - Meetings Dashboard
// ============================================
// Listado de juntas con estado de sincronización
// ============================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/database/local';
import { syncMeetings } from '@/services/sync';

export default function MeetingsPage() {
    const [userName, setUserName] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success?: boolean, message?: string } | null>(null);

    // Obtener usuario de sesión
    useEffect(() => {
        const name = localStorage.getItem('yunta_userName');
        if (name) setUserName(name);
    }, []);

    // Query reactiva a Dexie - se actualiza sola al cambiar la BD
    const meetings = useLiveQuery(() => localDb.meetings.toArray());

    // Handler de sincronización
    const handleSync = async () => {
        const userId = localStorage.getItem('yunta_userId');
        if (!userId) {
            alert('Error: No se encontró sesión de usuario. Inicia sesión nuevamente.');
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);

        const result = await syncMeetings(userId);

        setIsSyncing(false);
        setSyncResult(result);

        if (result.success && result.count && result.count > 0) {
            alert(`✅ ${result.message}`);
        } else if (result.success && result.count === 0) {
            // Nada que sincronizar
        } else {
            alert(`❌ Error: ${result.error}`);
        }
    };

    const pendingCount = meetings?.filter(m => m.synced === 0).length || 0;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Juntas Directivas</h1>
                    <p className="text-gray-600">
                        {userName ? `Hola, ${userName}` : 'Bienvenido'} |
                        Estado: <span className={pendingCount > 0 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                            {pendingCount > 0 ? `${pendingCount} Pendiente(s) de subida` : 'Todo sincronizado'}
                        </span>
                    </p>
                </div>

                <div className="flex gap-3">
                    {/* Botón Sincronizar */}
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || pendingCount === 0}
                        className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSyncing ? (
                            <>
                                <span className="animate-spin mr-2">🔄</span> Sincronizando...
                            </>
                        ) : (
                            <>
                                <span className="mr-2">☁️</span> Subir Pendientes ({pendingCount})
                            </>
                        )}
                    </button>

                    {/* Botón Nueva Junta */}
                    <Link
                        href="/dashboard/meetings/create"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <span className="mr-2">➕</span> Nueva Junta
                    </Link>
                </div>
            </div>

            {/* Mensajes de Sync */}
            {syncResult && (
                <div className={`mb-6 p-4 rounded-lg ${syncResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {syncResult.message || syncResult.success ? 'Sincronización completada' : 'Error al sincronizar'}
                </div>
            )}

            {/* Lista de Juntas */}
            <div className="grid gap-4">
                {!meetings || meetings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 mb-2">No hay juntas registradas en este dispositivo.</p>
                        <p className="text-sm text-gray-400">Crea una nueva acta para comenzar.</p>
                    </div>
                ) : (
                    meetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-semibold text-gray-800">{meeting.title}</h3>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${meeting.synced === 1
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {meeting.synced === 1 ? 'Sincronizado' : 'Pendiente Local'}
                                </span>
                            </div>

                            <div className="text-sm text-gray-500 mb-4">
                                {new Date(meeting.date).toLocaleDateString()}
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 line-clamp-3 mb-3">
                                {meeting.content}
                            </div>

                            {meeting.synced === 0 && (
                                <div className="text-xs text-amber-600 flex items-center">
                                    <span className="mr-1">💾</span> Solo en este dispositivo
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
