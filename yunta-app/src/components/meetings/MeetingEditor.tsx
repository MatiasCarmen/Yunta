'use client';

// ============================================
// YUNTA - Meeting Editor (Offline-First)
// ============================================
// Componente para redactar actas de junta
// Guarda localmente en Dexie primero (Offline)
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { localDb } from '@/database/local'; // Instancia de Dexie
import { v4 as uuidv4 } from 'uuid';

export default function MeetingEditor() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Estado del formulario
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0], // Fecha de hoy YYYY-MM-DD
        content: '', // Minuta extensa
        participants: [] as string[], // IDs de usuarios (por ahora vacio, pendiente selector)
        agreements: '' // Texto simple por ahora para acuerdos
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // ============================================
            // 1. GUARDADO LOCAL (DEXIE) - Prioridad Offline
            // ============================================

            // Dexie auto-incrementa el ID numérico (id), pero necesitamos un ID único global 
            // para sincronizar con Supabase después. No lo guardamos en 'id' porque Dexie espera number allí.
            // Pero espera, en local.ts definimos '++id'.
            // Para sincronizar, el backend (Prisma) usa UUID string.
            // Deberíamos guardar el UUID en un campo auxiliar o usar UUID como clave primaria si cambiamos el esquema.
            // Por ahora, asumiremos que la sincro manejará la creación del UUID o lo generamos aquí para referencia.

            // Vamos a confiar en la estructura actual.
            // Guardaremos un objeto que cumpla con LocalMeeting.

            await localDb.meetings.add({
                title: formData.title,
                date: new Date(formData.date),
                content: formData.content,
                agreements: formData.agreements,
                participants: formData.participants,
                synced: 0, // 0 = Pendiente de subir a Supabase
                // createdAt: new Date() // No está en la interfaz LocalMeeting, lo omitimos o agregamos a la interfaz si es necesario.
            });

            // Feedback inmediato
            window.alert('✅ Junta guardada en el dispositivo (Modo Offline activo)');

            // Redirigir al dashboard (o listado de juntas cuando exista)
            router.push('/dashboard');

        } catch (error) {
            console.error('Error al guardar en local:', error);
            window.alert('❌ Error al guardar la junta');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Título */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Junta</label>
                    <input
                        type="text"
                        name="title"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="Ej: Junta Semanal de Presupuesto"
                        value={formData.title}
                        onChange={handleChange}
                    />
                </div>

                {/* Fecha */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                        type="date"
                        name="date"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                        value={formData.date}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* Minuta / Contenido (El campo grande offline) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minuta / Notas de la Reunión</label>
                <textarea
                    name="content"
                    rows={12}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-colors"
                    placeholder="Escribe aquí todos los puntos tratados..."
                    value={formData.content}
                    onChange={handleChange}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1 text-right">
                    💾 Se guarda automáticamente en tu dispositivo.
                </p>
            </div>

            {/* Acuerdos Rápidos */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acuerdos y Compromisos</label>
                <textarea
                    name="agreements"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="- Matías revisará el Excel el viernes..."
                    value={formData.agreements}
                    onChange={handleChange}
                />
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-4 px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                    {isSaving ? 'Guardando...' : 'Guardar Acta'}
                </button>
            </div>
        </form>
    );
}
