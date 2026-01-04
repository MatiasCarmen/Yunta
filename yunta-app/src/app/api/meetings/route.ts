// ============================================
// YUNTA - Meetings API
// ============================================
// GET /api/meetings - Obtener todas las juntas
// POST /api/meetings - Crear una nueva junta
// ============================================

import { NextResponse } from 'next/server';
import { prisma } from '@/database/client';

// GET - Listar juntas
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');

        const meetings = await prisma.meeting.findMany({
            where: {
                ...(userId && { createdById: userId }),
                ...(status && { status: status as any }),
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
    } catch (error: any) {
        console.error('Error obteniendo juntas:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

// POST - Crear junta individual
export async function POST(request: Request) {
    try {
        const body = await request.json();
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

    } catch (error: any) {
        console.error('Error creando junta:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
