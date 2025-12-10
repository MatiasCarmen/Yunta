// ============================================
// YUNTA - Prisma Client
// ============================================
// Cliente singleton de Prisma para Next.js
// Evita múltiples instancias en desarrollo (hot reload)
// ============================================

import { PrismaClient } from '@prisma/client';

// Declaración global para TypeScript
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// ============================================
// CONFIGURACIÓN DEL CLIENTE
// ============================================

/**
 * Cliente de Prisma con configuración optimizada
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
// MANEJO DE DESCONEXIÓN
// ============================================

/**
 * Desconecta el cliente de Prisma de forma segura
 */
export async function disconnectPrisma() {
    await prisma.$disconnect();
}

// Desconectar automáticamente cuando el proceso termina
process.on('beforeExit', async () => {
    await disconnectPrisma();
});

// ============================================
// UTILIDADES DE BASE DE DATOS
// ============================================

/**
 * Verifica la conexión a la base de datos
 */
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

/**
 * Obtiene información de la base de datos
 */
export async function getDatabaseInfo() {
    try {
        const result = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version();
    `;
        return result[0];
    } catch (error) {
        console.error('Failed to get database info:', error);
        return null;
    }
}

// Exportar tipos de Prisma para uso en la aplicación
export * from '@prisma/client';
