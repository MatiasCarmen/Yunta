// ============================================
// YUNTA - Login API Route
// ============================================
// Endpoint para autenticación por PIN
// POST /api/auth/login
// ============================================

import { NextResponse } from 'next/server';
import { loginWithPin, validatePinFormat } from '@/services/auth';

// ============================================
// TIPOS
// ============================================

interface LoginRequest {
    userId: string;
    pin: string;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: Request) {
    try {
        // ================================================
        // 1. LEER Y PARSEAR EL CUERPO DE LA SOLICITUD
        // ================================================

        let body: LoginRequest;

        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Formato de solicitud inválido. Se esperaba JSON.',
                },
                { status: 400 } // Bad Request
            );
        }

        // ================================================
        // 2. VALIDAR QUE TENGAMOS userId Y pin
        // ================================================

        const { userId, pin } = body;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo userId es requerido y debe ser un string.',
                },
                { status: 400 }
            );
        }

        if (!pin || typeof pin !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo pin es requerido y debe ser un string.',
                },
                { status: 400 }
            );
        }

        // Validar formato del PIN (4-6 dígitos)
        if (!validatePinFormat(pin)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El PIN debe contener entre 4 y 6 dígitos.',
                },
                { status: 400 }
            );
        }

        // ================================================
        // 3. LLAMAR AL SERVICIO DE AUTENTICACIÓN
        // ================================================

        const result = await loginWithPin(userId, pin);

        // ================================================
        // 4. DEVOLVER RESPUESTA SEGÚN EL RESULTADO
        // ================================================

        if (result.success) {
            // Login exitoso
            return NextResponse.json(
                {
                    success: true,
                    message: result.message,
                    user: result.user,
                },
                { status: 200 } // OK
            );
        } else {
            // Login fallido

            if (result.isLocked) {
                // Usuario bloqueado temporalmente
                return NextResponse.json(
                    {
                        success: false,
                        message: result.message,
                        isLocked: true,
                    },
                    { status: 423 } // Locked
                );
            } else {
                // PIN incorrecto (con intentos restantes)
                return NextResponse.json(
                    {
                        success: false,
                        message: result.message,
                        remainingAttempts: result.remainingAttempts,
                    },
                    { status: 401 } // Unauthorized
                );
            }
        }
    } catch (error) {
        // ================================================
        // MANEJO DE ERRORES INESPERADOS
        // ================================================

        console.error('Error en login API:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Error interno del servidor. Por favor, intenta de nuevo.',
            },
            { status: 500 } // Internal Server Error
        );
    }
}

// ============================================
// CONFIGURACIÓN DE RUTA
// ============================================

// Prevenir caching de esta ruta (datos sensibles)
export const dynamic = 'force-dynamic';
