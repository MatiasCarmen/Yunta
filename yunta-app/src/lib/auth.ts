// ============================================
// YUNTA - Auth Library (Server-Only)
// ============================================
// Cookie-based session with signed JWT (jose)
// No Supabase Auth — PIN + httpOnly cookie
// ============================================

import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/database/client';
import type { Role } from '@/database';

// ============================================
// CONSTANTS
// ============================================

const COOKIE_NAME = 'yunta-session';
const SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'yunta-family-app-secret-key-change-me-in-production-2026'
);
const EXPIRY = '7d'; // 7 days

// ============================================
// TYPES
// ============================================

export interface SessionUser {
    id: string;
    name: string;
    role: Role;
}

interface SessionPayload extends JWTPayload {
    uid: string;
    name: string;
    role: Role;
}

// ============================================
// CREATE SESSION (call after successful login)
// ============================================

export async function createSession(user: SessionUser): Promise<void> {
    const token = await new SignJWT({ uid: user.id, name: user.name, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(SECRET);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
}

// ============================================
// DESTROY SESSION (logout)
// ============================================

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// ============================================
// GET CURRENT USER (from cookie)
// ============================================

export async function getCurrentUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET) as { payload: SessionPayload };

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: payload.uid },
            select: { id: true, name: true, role: true, status: true },
        });

        if (!user || user.status !== 'ACTIVE') return null;

        return { id: user.id, name: user.name, role: user.role as Role };
    } catch {
        return null;
    }
}

// ============================================
// REQUIRE AUTH (throws redirect if not logged in)
// ============================================

export async function requireAuth(): Promise<SessionUser> {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }
    return user;
}

// ============================================
// REQUIRE ROLE (throws redirect if wrong role)
// ============================================

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
    const user = await requireAuth();
    if (!allowedRoles.includes(user.role)) {
        redirect('/dashboard');
    }
    return user;
}

// ============================================
// ROLE CHECK HELPERS
// ============================================

export function canAccessJunta(role: Role): boolean {
    return role === 'EJECUTIVO' || role === 'GESTOR';
}

export function canAccessAdmin(role: Role): boolean {
    return role === 'EJECUTIVO';
}
