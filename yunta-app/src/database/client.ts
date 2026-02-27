// ============================================
// YUNTA - Prisma Client (PostgreSQL + Supabase)
// ============================================

import { PrismaClient } from '@prisma/client';

// Declaración global para TypeScript
declare global {
    var prisma: PrismaClient | undefined;
}

/**
 * Cliente de Prisma (PostgreSQL via Session Pooler)
 */
export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
});

// En desarrollo, guardamos la instancia en global para evitar
// crear múltiples conexiones durante hot reload
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// ============================================
// UTILIDADES DB
// ============================================

export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

