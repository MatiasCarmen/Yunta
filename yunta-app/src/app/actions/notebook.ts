'use server';

import { prisma } from '@/database/client';
import { requireRole } from '@/lib/auth';

// ============================================
// TYPES
// ============================================

export type NotebookData = {
    content: string;
    updatedAt: string;
};

// ============================================
// GET NOTEBOOK
// ============================================

export async function getNotebook(): Promise<NotebookData> {
    await requireRole(['EJECUTIVO', 'GESTOR']);

    const notebook = await prisma.globalNotebook.findUnique({
        where: { key: 'GLOBAL' },
    });

    if (!notebook) {
        return { content: '', updatedAt: new Date().toISOString() };
    }

    return {
        content: notebook.content,
        updatedAt: notebook.updatedAt.toISOString(),
    };
}

// ============================================
// SAVE NOTEBOOK (upsert)
// ============================================

export async function saveNotebook(
    content: string
): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
    const user = await requireRole(['EJECUTIVO', 'GESTOR']);

    try {
        const notebook = await prisma.globalNotebook.upsert({
            where: { key: 'GLOBAL' },
            update: {
                content,
                lastEditedById: user.id,
            },
            create: {
                key: 'GLOBAL',
                content,
                lastEditedById: user.id,
            },
        });

        return { success: true, updatedAt: notebook.updatedAt.toISOString() };
    } catch (error) {
        console.error('Error saving notebook:', error);
        return { success: false, error: 'No se pudo guardar.' };
    }
}
