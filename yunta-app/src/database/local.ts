// ============================================
// YUNTA - Local Database (Dexie.js)
// ============================================
// Base de datos local para soporte Offline-First
// Almacena transacciones pendientes y caché de datos
// ============================================

import Dexie, { type Table } from 'dexie';
import type { Role, TransactionType, PaymentMethod, ExpenseCategory } from '@prisma/client';

// ============================================
// INTERFACES LOCALES
// ============================================

export interface PendingTransaction {
    id?: number; // Auto-incremental local
    tempId: string; // UUID temporal generado en frontend
    amount: number;
    type: TransactionType;
    method: PaymentMethod;
    category?: ExpenseCategory | null;
    description: string;
    notes?: string | null;
    date: Date;
    receipt?: string | null;
    userId: string;
    createdAt: Date;
    status: 'PENDING' | 'SYNCING' | 'ERROR'; // Estado de sincronización
}

// ============================================
// CONFIGURACIÓN DE DEXIE
// ============================================

export class YuntaLocalDB extends Dexie {
    // Tablas
    pendingTransactions!: Table<PendingTransaction>;

    constructor() {
        super('YuntaLocalDB');

        this.version(1).stores({
            // Definición de esquema e índices
            pendingTransactions: '++id, tempId, status, userId, date'
        });
    }
}

// Singleton de la DB
export const localDb = new YuntaLocalDB();

// ============================================
// HOOKS Y UTILIDADES
// ============================================

/**
 * Guarda una transacción localmente cuando no hay internet
 */
export async function saveTransactionOffline(data: Omit<PendingTransaction, 'id' | 'status' | 'createdAt'>) {
    try {
        await localDb.pendingTransactions.add({
            ...data,
            status: 'PENDING',
            createdAt: new Date(),
        });
        return true;
    } catch (error) {
        console.error('Error guardando offline:', error);
        return false;
    }
}

/**
 * Obtiene transacciones pendientes para sincronizar
 */
export async function getPendingTransactions() {
    return await localDb.pendingTransactions
        .where('status')
        .equals('PENDING')
        .toArray();
}
