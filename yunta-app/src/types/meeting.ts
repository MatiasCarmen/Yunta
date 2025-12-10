// ============================================
// YUNTA - Meeting & Action Item Types
// ============================================
// Tipos para juntas y compromisos
// ============================================

import {
    Meeting,
    ActionItem,
    MeetingAttendance,
    MeetingStatus,
    ActionItemStatus,
    ActionItemPriority,
} from '@prisma/client';

// ============================================
// MEETING TYPES
// ============================================

/**
 * Datos para crear una nueva junta
 */
export interface CreateMeetingInput {
    title: string;
    description?: string;
    date: Date;
    durationMinutes?: number;
    location?: string;
    agenda?: string;
    createdById: string;
    attendeeIds?: string[]; // IDs de usuarios invitados
}

/**
 * Datos para actualizar una junta
 */
export interface UpdateMeetingInput {
    title?: string;
    description?: string;
    date?: Date;
    durationMinutes?: number;
    location?: string;
    agenda?: string;
    minutes?: string;
    notes?: string;
    status?: MeetingStatus;
}

/**
 * Junta con relaciones incluidas
 */
export interface MeetingWithRelations extends Meeting {
    createdBy: {
        id: string;
        name: string;
        role: string;
    };
    attendees: Array<{
        id: string;
        userId: string;
        user: {
            id: string;
            name: string;
            avatar?: string;
        };
        confirmed: boolean;
        attended: boolean;
    }>;
    actionItems: ActionItem[];
}

/**
 * Respuesta de junta para API
 */
export interface MeetingResponse {
    id: string;
    title: string;
    description?: string;
    date: Date;
    durationMinutes?: number;
    location?: string;
    agenda?: string;
    minutes?: string;
    notes?: string;
    status: MeetingStatus;
    startedAt?: Date;
    completedAt?: Date;
    createdById: string;
    createdBy?: {
        id: string;
        name: string;
    };
    attendeeCount: number;
    actionItemCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// ACTION ITEM TYPES
// ============================================

/**
 * Datos para crear un nuevo compromiso
 */
export interface CreateActionItemInput {
    title: string;
    description?: string;
    priority?: ActionItemPriority;
    dueDate?: Date;
    startDate?: Date;
    meetingId: string;
    assignedToId: string;
    createdById: string;
}

/**
 * Datos para actualizar un compromiso
 */
export interface UpdateActionItemInput {
    title?: string;
    description?: string;
    priority?: ActionItemPriority;
    status?: ActionItemStatus;
    dueDate?: Date;
    startDate?: Date;
    completedAt?: Date;
}

/**
 * Compromiso con relaciones incluidas
 */
export interface ActionItemWithRelations extends ActionItem {
    meeting: {
        id: string;
        title: string;
        date: Date;
    };
    assignedTo: {
        id: string;
        name: string;
        avatar?: string;
    };
    createdBy: {
        id: string;
        name: string;
    };
}

/**
 * Respuesta de compromiso para API
 */
export interface ActionItemResponse {
    id: string;
    title: string;
    description?: string;
    priority: ActionItemPriority;
    status: ActionItemStatus;
    dueDate?: Date;
    startDate?: Date;
    completedAt?: Date;
    meetingId: string;
    assignedToId: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// MEETING ATTENDANCE TYPES
// ============================================

/**
 * Datos para registrar asistencia
 */
export interface CreateAttendanceInput {
    meetingId: string;
    userId: string;
    confirmed?: boolean;
}

/**
 * Datos para actualizar asistencia
 */
export interface UpdateAttendanceInput {
    confirmed?: boolean;
    attended?: boolean;
    notes?: string;
}

// ============================================
// FILTER TYPES
// ============================================

/**
 * Filtros para consultar juntas
 */
export interface MeetingFilters {
    status?: MeetingStatus;
    createdById?: string;
    dateFrom?: Date;
    dateTo?: Date;
    includeAttendance?: boolean;
    includeActionItems?: boolean;
}

/**
 * Filtros para consultar compromisos
 */
export interface ActionItemFilters {
    status?: ActionItemStatus;
    priority?: ActionItemPriority;
    assignedToId?: string;
    meetingId?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    overdue?: boolean;
}

// ============================================
// SUMMARY TYPES
// ============================================

/**
 * Resumen de juntas
 */
export interface MeetingSummary {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
}

/**
 * Resumen de compromisos
 */
export interface ActionItemSummary {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byPriority: {
        low: number;
        medium: number;
        high: number;
        urgent: number;
    };
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Labels en español para estados de junta
 */
export const MEETING_STATUS_LABELS = {
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
} as const;

/**
 * Colores para estados de junta
 */
export const MEETING_STATUS_COLORS = {
    SCHEDULED: '#3B82F6',   // Blue
    IN_PROGRESS: '#F59E0B', // Amber
    COMPLETED: '#10B981',   // Green
    CANCELLED: '#6B7280',   // Gray
} as const;

/**
 * Labels en español para estados de compromiso
 */
export const ACTION_ITEM_STATUS_LABELS = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
} as const;

/**
 * Colores para estados de compromiso
 */
export const ACTION_ITEM_STATUS_COLORS = {
    PENDING: '#6B7280',     // Gray
    IN_PROGRESS: '#3B82F6', // Blue
    COMPLETED: '#10B981',   // Green
    CANCELLED: '#EF4444',   // Red
} as const;

/**
 * Labels en español para prioridades
 */
export const ACTION_ITEM_PRIORITY_LABELS = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    URGENT: 'Urgente',
} as const;

/**
 * Colores para prioridades
 */
export const ACTION_ITEM_PRIORITY_COLORS = {
    LOW: '#10B981',    // Green
    MEDIUM: '#F59E0B', // Amber
    HIGH: '#F97316',   // Orange
    URGENT: '#EF4444', // Red
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verifica si una junta está programada para hoy
 */
export function isMeetingToday(meetingDate: Date): boolean {
    const today = new Date();
    return (
        meetingDate.getDate() === today.getDate() &&
        meetingDate.getMonth() === today.getMonth() &&
        meetingDate.getFullYear() === today.getFullYear()
    );
}

/**
 * Verifica si un compromiso está vencido
 */
export function isActionItemOverdue(actionItem: ActionItem): boolean {
    if (!actionItem.dueDate || actionItem.status === 'COMPLETED' || actionItem.status === 'CANCELLED') {
        return false;
    }
    return new Date(actionItem.dueDate) < new Date();
}

/**
 * Calcula días hasta la fecha límite
 */
export function daysUntilDue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formatea duración en minutos a texto
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
