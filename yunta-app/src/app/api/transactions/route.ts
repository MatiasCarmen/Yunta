// ============================================
// YUNTA - Transactions API Route
// ============================================
// Endpoint para gestión de transacciones
// POST /api/transactions - Crear transacción
// GET /api/transactions - Listar transacciones
// ============================================

import { NextResponse } from 'next/server';
import { createTransaction, getTransactions } from '@/services/transactions';
import type { CreateTransactionInput } from '@/types/transaction';

// ============================================
// POST: CREAR TRANSACCIÓN
// ============================================

export async function POST(request: Request) {
    try {
        // ================================================
        // 1. PARSEAR Y VALIDAR REQUEST
        // ================================================

        let body: CreateTransactionInput & { userId: string };

        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Formato de solicitud inválido. Se esperaba JSON.',
                },
                { status: 400 }
            );
        }

        // ================================================
        // 2. VALIDACIONES BÁSICAS
        // ================================================

        const { userId, amount, type, method, description } = body;

        // Validar userId
        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo userId es requerido.',
                },
                { status: 400 }
            );
        }

        // Validar amount
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo amount es requerido y debe ser mayor a 0.',
                },
                { status: 400 }
            );
        }

        // Validar type
        if (!type || !['IN', 'OUT'].includes(type)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo type debe ser IN o OUT.',
                },
                { status: 400 }
            );
        }

        // Validar method
        if (!method) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo method es requerido.',
                },
                { status: 400 }
            );
        }

        // Validar category para gastos
        if (type === 'OUT' && !body.category) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo category es requerido para gastos.',
                },
                { status: 400 }
            );
        }

        // Validar description
        if (!description || description.trim().length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El campo description es requerido.',
                },
                { status: 400 }
            );
        }

        // ================================================
        // 3. LLAMAR AL SERVICIO DE TRANSACCIONES
        // ================================================

        const result = await createTransaction(body, userId);

        // ================================================
        // 4. RETORNAR RESPUESTA
        // ================================================

        return NextResponse.json(
            {
                success: true,
                message: result.message,
                transactions: result.transactions,
                count: result.transactions.length,
            },
            { status: 201 } // Created
        );

    } catch (error: any) {
        console.error('Error en API de transacciones:', error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Error interno del servidor.',
            },
            { status: 500 }
        );
    }
}

// ============================================
// GET: LISTAR TRANSACCIONES
// ============================================

export async function GET(request: Request) {
    try {
        // Extraer parámetros de búsqueda
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') as 'IN' | 'OUT' | null;
        const category = searchParams.get('category');
        const limit = searchParams.get('limit');

        // Validar userId
        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'El parámetro userId es requerido.',
                },
                { status: 400 }
            );
        }

        // Construir filtros
        const filters: any = {};

        if (type) {
            filters.type = type;
        }

        if (category) {
            filters.category = category;
        }

        if (limit) {
            filters.limit = parseInt(limit, 10);
        }

        // Obtener transacciones
        const transactions = await getTransactions(userId, filters);

        return NextResponse.json({
            success: true,
            transactions,
            count: transactions.length,
        });

    } catch (error: any) {
        console.error('Error al obtener transacciones:', error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Error interno del servidor.',
            },
            { status: 500 }
        );
    }
}

// Prevenir caching
export const dynamic = 'force-dynamic';
