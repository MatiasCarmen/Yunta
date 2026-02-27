'use server';

// ============================================
// YUNTA - Admin Actions (Server Actions)
// ============================================
// EJECUTIVO-only operations for user management
// ============================================

import { prisma } from '@/database/client';
import { requireRole } from '@/lib/auth';
import { hashPin } from '@/services/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================
// ZOD SCHEMAS
// ============================================

const CreateUserSchema = z.object({
    name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
    role: z.enum(['EJECUTIVO', 'GESTOR', 'BENEFICIARIO']),
    pin: z.string().regex(/^\d{4,6}$/, 'PIN debe tener 4-6 dígitos'),
    email: z.string().email('Email inválido').optional(),
});

const UpdateRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(['EJECUTIVO', 'GESTOR', 'BENEFICIARIO']),
});

const ResetPinSchema = z.object({
    userId: z.string().uuid(),
    newPin: z.string().regex(/^\d{4,6}$/, 'PIN debe tener 4-6 dígitos'),
});

// ============================================
// LIST USERS
// ============================================

export async function listUsers() {
    await requireRole(['EJECUTIVO']);

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            failedLoginAttempts: true,
        },
        orderBy: [{ role: 'desc' }, { name: 'asc' }],
    });

    return users;
}

// ============================================
// CREATE USER
// ============================================

export async function createUser(formData: {
    name: string;
    role: string;
    pin: string;
    email?: string;
}) {
    await requireRole(['EJECUTIVO']);

    const parsed = CreateUserSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message };
    }

    const { name, role, pin, email } = parsed.data;

    // Check duplicate email
    if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: 'Ya existe un usuario con ese email.' };
        }
    }

    const pinHash = await hashPin(pin);

    await prisma.user.create({
        data: {
            name,
            email: email || `${name.toLowerCase().replace(/\s/g, '')}@yunta.local`,
            role,
            status: 'ACTIVE',
            pinHash,
        },
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
}

// ============================================
// CHANGE ROLE
// ============================================

export async function changeUserRole(formData: { userId: string; role: string }) {
    await requireRole(['EJECUTIVO']);

    const parsed = UpdateRoleSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message };
    }

    await prisma.user.update({
        where: { id: parsed.data.userId },
        data: { role: parsed.data.role },
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
}

// ============================================
// RESET PIN
// ============================================

export async function resetUserPin(formData: { userId: string; newPin: string }) {
    await requireRole(['EJECUTIVO']);

    const parsed = ResetPinSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message };
    }

    const newHash = await hashPin(parsed.data.newPin);

    await prisma.user.update({
        where: { id: parsed.data.userId },
        data: {
            pinHash: newHash,
            failedLoginAttempts: 0,
            lastLockedAt: null,
        },
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
}

// ============================================
// TOGGLE USER STATUS (activate/deactivate)
// ============================================

export async function toggleUserStatus(userId: string) {
    await requireRole(['EJECUTIVO']);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
    });

    if (!user) return { success: false, error: 'Usuario no encontrado.' };

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true, newStatus };
}
