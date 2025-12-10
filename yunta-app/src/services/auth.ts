// ============================================
// YUNTA - Authentication Service
// ============================================
// Servicio de autenticación por PIN con bloqueo temporal
// ============================================

import { prisma } from '../database/client';
import * as bcrypt from 'bcryptjs';
import type { User } from '../database';

// ============================================
// CONSTANTES DE SEGURIDAD
// ============================================

const MAX_FAILED_ATTEMPTS = 3; // Máximo de intentos fallidos permitidos
const LOCKOUT_TIME_MINUTES = 5; // Tiempo de bloqueo en minutos

// ============================================
// TIPOS
// ============================================

export interface LoginResult {
    success: boolean;
    user?: Omit<User, 'pinHash'>; // Usuario sin el hash del PIN
    message?: string;
    isLocked?: boolean;
    remainingAttempts?: number;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Autentica un usuario mediante su ID y PIN
 * Implementa lógica de bloqueo temporal tras intentos fallidos
 */
export async function loginWithPin(
    userId: string,
    pin: string
): Promise<LoginResult> {
    // Buscar usuario
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    // Validar que el usuario existe y está activo
    if (!user || user.status !== 'ACTIVE') {
        return {
            success: false,
            message: 'Usuario no encontrado o inactivo',
        };
    }

    // ================================================
    // 1. LÓGICA DE BLOQUEO TEMPORAL
    // ================================================

    if (user.lastLockedAt) {
        const now = new Date();
        const lockedTime = new Date(user.lastLockedAt);
        const minutesSinceLock = (now.getTime() - lockedTime.getTime()) / (1000 * 60);

        // Si aún está dentro del tiempo de bloqueo
        if (minutesSinceLock < LOCKOUT_TIME_MINUTES) {
            const remainingMinutes = Math.ceil(LOCKOUT_TIME_MINUTES - minutesSinceLock);

            return {
                success: false,
                isLocked: true,
                message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${remainingMinutes} minuto(s).`,
            };
        } else {
            // El tiempo de bloqueo ha expirado, resetear intentos
            await prisma.user.update({
                where: { id: userId },
                data: {
                    failedLoginAttempts: 0,
                    lastLockedAt: null,
                },
            });

            // Actualizar el objeto user en memoria
            user.failedLoginAttempts = 0;
            user.lastLockedAt = null;
        }
    }

    // ================================================
    // 2. COMPARACIÓN DEL PIN
    // ================================================

    const isPinValid = await bcrypt.compare(pin, user.pinHash);

    if (isPinValid) {
        // ================================================
        // 3. ÉXITO: Limpiar intentos fallidos y actualizar último acceso
        // ================================================

        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lastLockedAt: null,
                lastLoginAt: new Date(),
            },
        });

        // Devolver usuario sin datos sensibles
        const { pinHash, ...safeUser } = user;

        return {
            success: true,
            user: safeUser,
            message: `Bienvenido, ${user.name}!`,
        };
    } else {
        // ================================================
        // 4. FRACASO: Incrementar intentos y aplicar bloqueo si es necesario
        // ================================================

        const newFailedAttempts = user.failedLoginAttempts + 1;
        const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: newFailedAttempts,
                lastLockedAt: shouldLock ? new Date() : undefined,
            },
        });

        if (shouldLock) {
            return {
                success: false,
                isLocked: true,
                message: `PIN incorrecto. Has superado el límite de intentos. Cuenta bloqueada por ${LOCKOUT_TIME_MINUTES} minutos.`,
            };
        } else {
            const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;

            return {
                success: false,
                remainingAttempts,
                message: `PIN incorrecto. Te quedan ${remainingAttempts} intento(s).`,
            };
        }
    }
}

/**
 * Hashea un PIN para almacenamiento seguro
 * Útil para crear nuevos usuarios o cambiar PINs
 */
export async function hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
}

/**
 * Valida el formato de un PIN
 * Debe ser entre 4 y 6 dígitos
 */
export function validatePinFormat(pin: string): boolean {
    const pinRegex = /^[0-9]{4,6}$/;
    return pinRegex.test(pin);
}

/**
 * Desbloquea manualmente un usuario (solo para administradores)
 */
export async function unlockUser(userId: string): Promise<boolean> {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lastLockedAt: null,
            },
        });
        return true;
    } catch (error) {
        console.error('Error al desbloquear usuario:', error);
        return false;
    }
}

/**
 * Obtiene información del estado de bloqueo de un usuario
 */
export async function getUserLockStatus(userId: string): Promise<{
    isLocked: boolean;
    remainingMinutes?: number;
    failedAttempts: number;
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            failedLoginAttempts: true,
            lastLockedAt: true,
        },
    });

    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    if (!user.lastLockedAt) {
        return {
            isLocked: false,
            failedAttempts: user.failedLoginAttempts,
        };
    }

    const now = new Date();
    const lockedTime = new Date(user.lastLockedAt);
    const minutesSinceLock = (now.getTime() - lockedTime.getTime()) / (1000 * 60);

    if (minutesSinceLock < LOCKOUT_TIME_MINUTES) {
        return {
            isLocked: true,
            remainingMinutes: Math.ceil(LOCKOUT_TIME_MINUTES - minutesSinceLock),
            failedAttempts: user.failedLoginAttempts,
        };
    }

    return {
        isLocked: false,
        failedAttempts: user.failedLoginAttempts,
    };
}
