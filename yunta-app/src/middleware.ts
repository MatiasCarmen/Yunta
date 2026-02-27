// ============================================
// YUNTA - Edge Middleware
// ============================================
// Protects /dashboard routes via JWT cookie
// Validates role for /dashboard/junta and /dashboard/admin
// ============================================

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'yunta-session';
const SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'yunta-family-app-secret-key-change-me-in-production-2026'
);

// Role-based route restrictions
const JUNTA_ROLES = ['EJECUTIVO', 'GESTOR'];
const ADMIN_ROLES = ['EJECUTIVO'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /dashboard routes
    if (!pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    // Read session cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
        // No session → redirect to login silently
        return NextResponse.redirect(new URL('/', request.url));
    }

    try {
        const { payload } = await jwtVerify(token, SECRET);
        const role = payload.role as string;

        // /dashboard/junta — EJECUTIVO or GESTOR only
        if (pathname.startsWith('/dashboard/junta') && !JUNTA_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // /dashboard/admin — EJECUTIVO only
        if (pathname.startsWith('/dashboard/admin') && !ADMIN_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        return NextResponse.next();
    } catch {
        // Invalid/expired token → redirect to login
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.delete(COOKIE_NAME);
        return response;
    }
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
