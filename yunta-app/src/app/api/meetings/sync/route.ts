// ============================================
// YUNTA - Sync Meetings API
// ============================================
// Endpoint para sincronizar juntas creadas offline
// POST /api/meetings/sync
// ============================================

import { NextResponse } from 'next/server';
import { prisma } from '@/database/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, meetings } = body;

        if (!userId || !meetings || !Array.isArray(meetings)) {
            return NextResponse.json(
                { success: false, message: 'Formato inválido' },
                { status: 400 }
            );
        }

        const results = [];

        // Procesar cada junta
        for (const meeting of meetings) {
            // 1. Crear la junta en Prisma
            const newMeeting = await prisma.meeting.create({
                data: {
                    title: meeting.title,
                    date: new Date(meeting.date),
                    minutes: meeting.content, // Mapear content -> minutes
                    notes: meeting.agreements, // Mapear agreements -> notes
                    status: 'COMPLETED', // Asumimos que si se sube ya pasó o está en acta
                    createdById: userId, // El usuario que sincroniza es el creador

                    // Crear asistentes si hay
                    ...(meeting.participants && meeting.participants.length > 0 && {
                        attendees: {
                            create: meeting.participants.map((participantId: string) => ({
                                userId: participantId,
                                confirmed: true,
                                attended: true,
                            })),
                        },
                    })
                }
            });

            results.push({ tempId: meeting.tempId || meeting.id, serverId: newMeeting.id });
        }

        return NextResponse.json({
            success: true,
            count: results.length,
            results
        });

    } catch (error: any) {
        console.error('Error sincronizando juntas:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
