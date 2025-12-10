// ============================================
// YUNTA - Users List API Route
// ============================================
// Endpoint para obtener lista de usuarios para el selector
// GET /api/auth/users
// ============================================

import { NextResponse } from 'next/server';
import { prisma } from '@/database/client';

// ============================================
// GET HANDLER
// ============================================

export async function GET() {
    try {
        // Obtener usuarios activos
        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
            },
            orderBy: [
                { role: 'desc' }, // EJECUTIVO primero
                { name: 'asc' },  // Luego alfabéticamente
            ],
        });

        return NextResponse.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Error al obtener usuarios.',
            },
            { status: 500 }
        );
    }
}

// Prevenir caching
export const dynamic = 'force-dynamic';
