// ============================================
// YUNTA - Database Index
// ============================================
// Exportación centralizada de utilidades de BD
// ============================================

// Exportar el cliente de Prisma y todos sus tipos
export * from './client';

// Re-exportar tipos específicos para conveniencia
export type {
    User,
    Transaction,
    Meeting,
    ActionItem,
    MeetingAttendance,
    Role,
    UserStatus,
    TransactionType,
    PaymentMethod,
    ExpenseCategory,
    MeetingStatus,
    ActionItemStatus,
    ActionItemPriority,
} from '@prisma/client';
