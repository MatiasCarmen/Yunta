// ============================================
// YUNTA - Transaction Types
// ============================================
// Tipos para el modelo de transacciones
// ============================================

import { TransactionType, PaymentMethod, ExpenseCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// TRANSACTION TYPES
// ============================================

/**
 * Datos para crear una nueva transacción
 */
export interface CreateTransactionInput {
    amount: number | Decimal;
    type: TransactionType;
    method: PaymentMethod;
    category?: ExpenseCategory;
    description: string;
    notes?: string;
    date?: Date;
    receipt?: string;
    userId: string;
}

/**
 * Datos para actualizar una transacción existente
 */
export interface UpdateTransactionInput {
    amount?: number | Decimal;
    type?: TransactionType;
    method?: PaymentMethod;
    category?: ExpenseCategory;
    description?: string;
    notes?: string;
    date?: Date;
    receipt?: string;
}

/**
 * Respuesta de transacción (para API)
 */
export interface TransactionResponse {
    id: string;
    amount: Decimal;
    type: TransactionType;
    method: PaymentMethod;
    category?: ExpenseCategory;
    description: string;
    notes?: string;
    date: Date;
    receipt?: string;
    userId: string;
    userName?: string; // Incluido en joins
    createdAt: Date;
    updatedAt: Date;
    isEdited: boolean;
    lastEditedAt?: Date;
}

/**
 * Filtros para consultar transacciones
 */
export interface TransactionFilters {
    userId?: string;
    type?: TransactionType;
    method?: PaymentMethod;
    category?: ExpenseCategory;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
}

/**
 * Resumen financiero
 */
export interface FinancialSummary {
    totalIncome: Decimal;
    totalExpenses: Decimal;
    balance: Decimal;
    transactionCount: number;
    period: {
        from: Date;
        to: Date;
    };
}

/**
 * Resumen por categoría
 */
export interface CategorySummary {
    category: ExpenseCategory;
    total: Decimal;
    count: number;
    percentage: number;
}

/**
 * Resumen por método de pago
 */
export interface PaymentMethodSummary {
    method: PaymentMethod;
    total: Decimal;
    count: number;
    percentage: number;
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Labels en español para tipos de transacción
 */
export const TRANSACTION_TYPE_LABELS = {
    IN: 'Ingreso',
    OUT: 'Gasto',
} as const;

/**
 * Colores para tipos de transacción
 */
export const TRANSACTION_TYPE_COLORS = {
    IN: '#10B981',  // Green
    OUT: '#EF4444', // Red
} as const;

/**
 * Labels en español para métodos de pago
 */
export const PAYMENT_METHOD_LABELS = {
    CASH: 'Efectivo',
    DEBIT: 'Débito',
    CREDIT_BCP: 'BCP Visa Dorada',
    YAPE: 'Yape',
} as const;

/**
 * Labels en español para categorías de gasto
 */
export const EXPENSE_CATEGORY_LABELS = {
    FOOD: 'Comida',
    MOBILITY: 'Movilidad',
    SHOPPING: 'Compras',
    ERRANDS: 'Encargos',
    MERCHANDISE: 'Mercadería',
    HEALTH: 'Salud',
    EDUCATION: 'Educación',
    ENTERTAINMENT: 'Entretenimiento',
    UTILITIES: 'Servicios',
    OTHER: 'Otros',
    RESERVATION_FUNDS: 'Fondo de Reserva',
    PAYROLL: 'Nómina',
} as const;

/**
 * Colores para categorías de gasto
 */
export const EXPENSE_CATEGORY_COLORS = {
    FOOD: '#F59E0B',
    MOBILITY: '#3B82F6',
    SHOPPING: '#EC4899',
    ERRANDS: '#8B5CF6',
    MERCHANDISE: '#10B981',
    HEALTH: '#EF4444',
    EDUCATION: '#6366F1',
    ENTERTAINMENT: '#F97316',
    UTILITIES: '#14B8A6',
    OTHER: '#6B7280',
    RESERVATION_FUNDS: '#059669',
    PAYROLL: '#DC2626',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Formatea un monto a moneda peruana (PEN)
 */
export function formatCurrency(amount: number | Decimal): string {
    const numAmount = typeof amount === 'number' ? amount : Number(amount);
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
    }).format(numAmount);
}

/**
 * Convierte Decimal a number
 */
export function decimalToNumber(decimal: Decimal): number {
    return Number(decimal);
}

/**
 * Valida si un monto es válido
 */
export function isValidAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
}
