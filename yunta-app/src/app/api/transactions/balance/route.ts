// ============================================
// YUNTA - Balance API Route
// ============================================
// Endpoint para calcular el balance del usuario
// GET /api/transactions/balance
// ============================================

import { NextResponse } from 'next/server';
import { getBalance } from '@/services/transactions';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El parámetro userId es requerido.',
                },
                { status: 400 }
            );
        }

        const balance = await getBalance(userId);

        return NextResponse.json({
            success: true,
            ...balance,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor.';
        console.error('Error al obtener balance:', error);

        return NextResponse.json(
            {
                success: false,
                message,
            },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
