// ============================================
// YUNTA - Current User API
// ============================================
// GET /api/auth/me — Returns current session user
// ============================================

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
}

export const dynamic = 'force-dynamic';
