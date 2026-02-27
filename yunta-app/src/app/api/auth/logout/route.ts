// ============================================
// YUNTA - Logout API Route
// ============================================
// POST /api/auth/logout — Destruye la cookie de sesión
// ============================================

import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
    await destroySession();
    return NextResponse.json({ success: true });
}

export const dynamic = 'force-dynamic';
