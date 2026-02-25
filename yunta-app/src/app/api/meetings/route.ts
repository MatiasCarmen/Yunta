// ============================================
// YUNTA - Meetings API
// ============================================
// GET /api/meetings - Obtener todas las juntas
// POST /api/meetings - Crear una nueva junta
// ============================================

import { NextResponse } from 'next/server';
import { prisma } from '@/database/client';
import { $Enums } from '@prisma/client';

// GET - Listar juntas
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');

        const meetingStatus = status && (Object.values($Enums.MeetingStatus) as string[]).includes(status)
            ? (status as $Enums.MeetingStatus)
            : undefined;

        const meetings = await prisma.meeting.findMany({
            where: {
                ...(userId && { createdById: userId }),
                ...(meetingStatus && { status: meetingStatus }),
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                attendees: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                },
                actionItems: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        return NextResponse.json({ success: true, meetings });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error obteniendo juntas:', error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}

// POST - Crear junta individual
export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            title?: string;
            date?: string;
            content?: string;
            agreements?: string;
            participants?: string[];
            userId?: string;
        };
        const { title, date, content, agreements, participants, userId } = body;

        if (!title || !date || !userId) {
            return NextResponse.json(
                { success: false, message: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        const meeting = await prisma.meeting.create({
            data: {
                title,
                date: new Date(date),
                minutes: content || '',
                notes: agreements || '',
                status: 'COMPLETED',
                createdById: userId,

                // Crear asistentes si hay
                ...(participants && participants.length > 0 && {
                    attendees: {
                        create: participants.map((participantId: string) => ({
                            userId: participantId,
                            confirmed: true,
                            attended: true,
                        })),
                    },
                }),
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                attendees: true,
            },
        });

        return NextResponse.json({ success: true, meeting });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error creando junta:', error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
