// ============================================
// YUNTA - Transactions Service
// ============================================
// Lógica de negocio para gestión de transacciones
// Incluye la regla automática 300/50 para ingresos
// ============================================

import { prisma } from '../database/client';
import type { CreateTransactionInput } from '../types/transaction';
import type { Transaction } from '../database';

// ============================================
// CONSTANTES DE REGLAS DE NEGOCIO
// ============================================

const YUNTA_RULES = {
    RESERVATION_FUND: 300, // Soles para junta semanal
    PAYROLL: 50,           // Soles para pago de personal
};

// ============================================
// INTERFACES
// ============================================

export interface CreateTransactionResult {
    success: boolean;
    transactions: Transaction[];
    message: string;
}

// ============================================
// FUNCIÓN PRINCIPAL: CREAR TRANSACCIÓN
// ============================================

/**
 * Crea una transacción y aplica reglas de negocio automáticas
 * 
 * REGLA 300/50:
 * - Si es un INGRESO (IN), automáticamente crea 2 gastos adicionales:
 *   1. 300 soles → RESERVATION_FUNDS (Junta Semanal)
 *   2. 50 soles → PAYROLL (Pago de Personal)
 * 
 * ATOMICIDAD:
 * - Usa transacción de BD para garantizar que las 3 operaciones
 *   se ejecuten juntas o ninguna se ejecute
 */
export async function createTransaction(
    data: CreateTransactionInput,
    userId: string
): Promise<CreateTransactionResult> {
    try {
        // Validar datos básicos
        if (!data.amount || data.amount <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        if (!data.type || !['IN', 'OUT'].includes(data.type)) {
            throw new Error('El tipo de transacción debe ser IN o OUT');
        }

        if (!data.method) {
            throw new Error('El método de pago es requerido');
        }

        // Si es un gasto, la categoría es obligatoria
        if (data.type === 'OUT' && !data.category) {
            throw new Error('La categoría es requerida para gastos');
        }

        const createdTransactions: Transaction[] = [];

        // ================================================
        // TRANSACCIÓN ATÓMICA: Crear 1 o 3 registros
        // ================================================

        await prisma.$transaction(async (tx) => {
            // ================================================
            // 1. CREAR LA TRANSACCIÓN ORIGINAL
            // ================================================

            const mainTransaction = await tx.transaction.create({
                data: {
                    amount: data.amount,
                    type: data.type,
                    method: data.method,
                    category: data.category,
                    description: data.description,
                    notes: data.notes,
                    date: data.date ? new Date(data.date) : new Date(),
                    receipt: data.receipt,
                    userId: userId,
                },
            });

            createdTransactions.push(mainTransaction);

            // ================================================
            // 2. APLICAR REGLA 300/50 SI ES INGRESO
            // ================================================

            if (data.type === 'IN') {
                // 2.1 Crear gasto de 300 soles (Fondo de Reserva)
                const reservationTransaction = await tx.transaction.create({
                    data: {
                        amount: YUNTA_RULES.RESERVATION_FUND,
                        type: 'OUT',
                        method: data.method, // Mismo método que el ingreso
                        category: 'RESERVATION_FUNDS',
                        description: `Fondo de Reserva - Junta Semanal (Auto-generado de ingreso #${mainTransaction.id.substring(0, 8)})`,
                        notes: 'Transacción automática según regla 300/50 de YUNTA',
                        date: new Date(),
                        userId: userId,
                    },
                });

                createdTransactions.push(reservationTransaction);

                // 2.2 Crear gasto de 50 soles (Pago de Personal)
                const payrollTransaction = await tx.transaction.create({
                    data: {
                        amount: YUNTA_RULES.PAYROLL,
                        type: 'OUT',
                        method: data.method,
                        category: 'PAYROLL',
                        description: `Pago de Personal (Auto-generado de ingreso #${mainTransaction.id.substring(0, 8)})`,
                        notes: 'Transacción automática según regla 300/50 de YUNTA',
                        date: new Date(),
                        userId: userId,
                    },
                });

                createdTransactions.push(payrollTransaction);
            }
        });

        // ================================================
        // RETORNAR RESULTADO
        // ================================================

        const message = data.type === 'IN'
            ? `Ingreso registrado exitosamente. Se aplicó la regla 300/50: ${YUNTA_RULES.RESERVATION_FUND} soles reservados para junta semanal y ${YUNTA_RULES.PAYROLL} soles para personal.`
            : 'Gasto registrado exitosamente.';

        return {
            success: true,
            transactions: createdTransactions,
            message,
        };
    } catch (error) {
        console.error('Error al crear transacción:', error);
        throw error;
    }
}

// ============================================
// FUNCIÓN: OBTENER TRANSACCIONES
// ============================================

export async function getTransactions(userId: string, filters?: {
    type?: 'IN' | 'OUT';
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}) {
    try {
        const where: any = { userId };

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.category) {
            where.category = filters.category;
        }

        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.date.lte = filters.endDate;
            }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            take: filters?.limit || 100,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        return transactions;
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        throw error;
    }
}

// ============================================
// FUNCIÓN: CALCULAR BALANCE
// ============================================

export async function getBalance(userId: string) {
    try {
        const [incomeSummary, expenseSummary] = await Promise.all([
            // Total de ingresos
            prisma.transaction.aggregate({
                where: {
                    userId,
                    type: 'IN',
                },
                _sum: {
                    amount: true,
                },
            }),
            // Total de gastos
            prisma.transaction.aggregate({
                where: {
                    userId,
                    type: 'OUT',
                },
                _sum: {
                    amount: true,
                },
            }),
        ]);

        const totalIncome = Number(incomeSummary._sum.amount) || 0;
        const totalExpenses = Number(expenseSummary._sum.amount) || 0;
        const balance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            balance,
        };
    } catch (error) {
        console.error('Error al calcular balance:', error);
        throw error;
    }
}
