// ============================================
// YUNTA - Transactions API Route
// ============================================
// POST /api/transactions - Crear transacción
// GET /api/transactions - Listar transacciones
// ============================================
// userId se resuelve en el servidor (usuario EJECUTIVO por defecto).
// El cliente NO envía userId.
// ============================================

import { NextResponse } from 'next/server';
import { createTransaction, getTransactions } from '@/services/transactions';
import { ExpenseCategory } from '@prisma/client';
import { prisma } from '@/database/client';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// ============================================
// ZOD SCHEMA — Validación del payload
// ============================================

const CreateTransactionSchema = z.object({
    amount: z.number().positive('El monto debe ser mayor a 0'),
    type: z.enum(['IN', 'OUT'], { message: 'type debe ser IN o OUT' }),
    method: z.enum(['CASH', 'DEBIT', 'CREDIT_BCP', 'YAPE'], { message: 'Método de pago inválido' }),
    category: z.enum([
        'FOOD', 'MOBILITY', 'SHOPPING', 'ERRANDS', 'MERCHANDISE',
        'HEALTH', 'EDUCATION', 'ENTERTAINMENT', 'UTILITIES', 'OTHER',
        'RESERVATION_FUNDS', 'PAYROLL'
    ]).optional(),
    description: z.string().min(1, 'La descripción es requerida'),
    notes: z.string().optional(),
    date: z.string().optional(),
    receipt: z.string().optional(),
});

// ============================================
// RESOLVE DEFAULT USER (server-side)
// ============================================

async function resolveDefaultUserId(): Promise<string> {
    // 1. Buscar EJECUTIVO
    const ejecutivo = await prisma.user.findFirst({
        where: { role: 'EJECUTIVO', status: 'ACTIVE' },
        select: { id: true },
    });
    if (ejecutivo) return ejecutivo.id;

    // 2. Fallback: GESTOR
    const gestor = await prisma.user.findFirst({
        where: { role: 'GESTOR', status: 'ACTIVE' },
        select: { id: true },
    });
    if (gestor) return gestor.id;

    // 3. Fallback: cualquier usuario activo
    const anyUser = await prisma.user.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
    });
    if (anyUser) return anyUser.id;

    throw new Error(
        'No existe usuario admin. Ejecuta seed o crea un usuario desde la app.'
    );
}

// ============================================
// POST: CREAR TRANSACCIÓN
// ============================================

export async function POST(request: Request) {
    try {
        // 1. Parse body
        let rawBody: unknown;
        try {
            rawBody = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, message: 'Formato de solicitud inválido. Se esperaba JSON.' },
                { status: 400 }
            );
        }

        // 2. Validate with Zod
        const parsed = CreateTransactionSchema.safeParse(rawBody);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
            return NextResponse.json(
                { success: false, message: firstError },
                { status: 400 }
            );
        }

        const body = parsed.data;

        // 3. Validate category for OUT
        if (body.type === 'OUT' && !body.category) {
            return NextResponse.json(
                { success: false, message: 'La categoría es requerida para gastos.' },
                { status: 400 }
            );
        }

        // 4. Resolve userId — prefer session, fallback to default
        let userId: string;
        try {
            const sessionUser = await getCurrentUser();
            userId = sessionUser ? sessionUser.id : await resolveDefaultUserId();
        } catch {
            return NextResponse.json(
                { success: false, message: 'No existe usuario admin. Ejecuta seed o crea un usuario.' },
                { status: 500 }
            );
        }

        // 5. Create transaction
        const result = await createTransaction(
            {
                amount: body.amount,
                type: body.type,
                method: body.method,
                category: body.category,
                description: body.description,
                notes: body.notes,
                date: body.date ? new Date(body.date) : undefined,
                receipt: body.receipt,
            },
            userId
        );

        return NextResponse.json(
            {
                success: true,
                message: result.message,
                transactions: result.transactions,
                count: result.transactions.length,
            },
            { status: 201 }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor.';
        console.error('Error en API de transacciones:', error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}

// ============================================
// GET: LISTAR TRANSACCIONES
// ============================================

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let userId = searchParams.get('userId');
        const type = searchParams.get('type') as 'IN' | 'OUT' | null;
        const category = searchParams.get('category');
        const limit = searchParams.get('limit');

        // Si no se envía userId, resolver por defecto
        if (!userId) {
            try {
                userId = await resolveDefaultUserId();
            } catch {
                return NextResponse.json(
                    { success: false, message: 'No existe usuario admin.' },
                    { status: 500 }
                );
            }
        }

        const parsedCategory = category && (Object.values(ExpenseCategory) as string[]).includes(category)
            ? (category as ExpenseCategory)
            : undefined;

        const filters: { type?: 'IN' | 'OUT'; category?: ExpenseCategory; limit?: number } = {};
        if (type) filters.type = type;
        if (parsedCategory) filters.category = parsedCategory;
        if (limit) filters.limit = parseInt(limit, 10);

        const transactions = await getTransactions(userId, filters);

        return NextResponse.json({
            success: true,
            transactions,
            count: transactions.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor.';
        console.error('Error al obtener transacciones:', error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}

// Prevenir caching
export const dynamic = 'force-dynamic';
