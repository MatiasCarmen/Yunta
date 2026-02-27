// ============================================
// YUNTA - Login API Route
// ============================================
// POST /api/auth/login — Autenticación por PIN
// Setea cookie httpOnly firmada (JWT)
// ============================================

import { NextResponse } from 'next/server';
import { loginWithPin, validatePinFormat } from '@/services/auth';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        let body: { userId: string; pin: string };

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, message: 'Formato de solicitud inválido.' },
                { status: 400 }
            );
        }

        const { userId, pin } = body;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { success: false, message: 'userId es requerido.' },
                { status: 400 }
            );
        }

        if (!pin || typeof pin !== 'string' || !validatePinFormat(pin)) {
            return NextResponse.json(
                { success: false, message: 'El PIN debe contener entre 4 y 6 dígitos.' },
                { status: 400 }
            );
        }

        const result = await loginWithPin(userId, pin);

        if (result.success && result.user) {
            // Set signed httpOnly cookie
            await createSession({
                id: result.user.id,
                name: result.user.name,
                role: result.user.role,
            });

            return NextResponse.json({
                success: true,
                message: result.message,
                user: result.user,
            });
        }

        // Failed login
        const status = result.isLocked ? 423 : 401;
        return NextResponse.json(
            {
                success: false,
                message: result.message,
                isLocked: result.isLocked,
                remainingAttempts: result.remainingAttempts,
            },
            { status }
        );
    } catch (error) {
        console.error('Error en login API:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor.' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
