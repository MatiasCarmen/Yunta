// ============================================
// YUNTA - TypeScript Types
// ============================================
// Tipos complementarios al schema de Prisma
// ============================================

import { Role, UserStatus } from '@prisma/client';

// ============================================
// USER TYPES
// ============================================

/**
 * Datos para crear un nuevo usuario
 */
export interface CreateUserInput {
    name: string;
    email?: string;
    phone?: string;
    role: Role;
    pin: string; // PIN en texto plano (se hasheará antes de guardar)
    avatar?: string;
    bio?: string;
    birthDate?: Date;
}

/**
 * Datos para actualizar un usuario existente
 */
export interface UpdateUserInput {
    name?: string;
    email?: string;
    phone?: string;
    role?: Role;
    avatar?: string;
    bio?: string;
    birthDate?: Date;
    status?: UserStatus;
}

/**
 * Datos de usuario para respuesta (sin información sensible)
 */
export interface UserResponse {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: Role;
    status: UserStatus;
    avatar?: string;
    bio?: string;
    birthDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

/**
 * Credenciales de login
 */
export interface LoginCredentials {
    identifier: string; // Email o ID
    pin: string;
}

/**
 * Resultado de autenticación
 */
export interface AuthResult {
    success: boolean;
    user?: UserResponse;
    token?: string;
    message?: string;
}

// ============================================
// SECURITY TYPES
// ============================================

/**
 * Configuración de seguridad del PIN
 */
export interface PinConfig {
    minLength: number;
    maxLength: number;
    maxAttempts: number;
    lockoutDuration: number; // en minutos
}

/**
 * Constantes de seguridad
 */
export const SECURITY_CONFIG: PinConfig = {
    minLength: 4,
    maxLength: 6,
    maxAttempts: 3,
    lockoutDuration: 15, // 15 minutos
};

// ============================================
// ROLE PERMISSIONS
// ============================================

/**
 * Permisos por rol
 */
export const ROLE_PERMISSIONS = {
    BENEFICIARIO: {
        canView: true,
        canSpend: true,
        canViewReports: false,
        canManageUsers: false,
        canManageMeetings: false,
    },
    GESTOR: {
        canView: true,
        canSpend: true,
        canViewReports: true,
        canManageUsers: false,
        canManageMeetings: false,
    },
    EJECUTIVO: {
        canView: true,
        canSpend: true,
        canViewReports: true,
        canManageUsers: true,
        canManageMeetings: true,
    },
} as const;

/**
 * Tipo para los permisos
 */
export type RolePermissions = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];

// ============================================
// UI TYPES
// ============================================

/**
 * Colores por rol (para UI)
 */
export const ROLE_COLORS = {
    BENEFICIARIO: '#3B82F6', // Blue
    GESTOR: '#10B981',       // Green
    EJECUTIVO: '#8B5CF6',    // Purple
} as const;

/**
 * Labels en español para roles
 */
export const ROLE_LABELS = {
    BENEFICIARIO: 'Beneficiario',
    GESTOR: 'Gestor',
    EJECUTIVO: 'Ejecutivo',
} as const;

/**
 * Labels en español para estados
 */
export const STATUS_LABELS = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    SUSPENDED: 'Suspendido',
} as const;
