'use client';

// ============================================
// YUNTA - Admin Users Panel
// ============================================
// EJECUTIVO-only. Manage users, roles, PINs.
// ============================================

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Key, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    listUsers,
    createUser,
    changeUserRole,
    resetUserPin,
    toggleUserStatus,
} from '@/app/actions/admin';

// ============================================
// TYPES
// ============================================

interface UserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
    failedLoginAttempts: number;
}

const ROLE_LABELS: Record<string, string> = {
    EJECUTIVO: 'Ejecutivo',
    GESTOR: 'Gestor',
    BENEFICIARIO: 'Beneficiario',
};

const ROLE_COLORS: Record<string, string> = {
    EJECUTIVO: 'bg-amber-100 text-amber-800 border-amber-200',
    GESTOR: 'bg-blue-100 text-blue-800 border-blue-200',
    BENEFICIARIO: 'bg-green-100 text-green-800 border-green-200',
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Create user form
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('BENEFICIARIO');
    const [newPin, setNewPin] = useState('');

    // Reset PIN form
    const [resetTarget, setResetTarget] = useState<string | null>(null);
    const [resetPinValue, setResetPinValue] = useState('');

    // P0-6 Fix: Verify role before rendering
    const [isAuthorized, setIsAuthorized] = useState(false);

    // ============================================
    // VERIFY ROLE (CLIENT-SIDE PRE-CHECK)
    // ============================================

    useEffect(() => {
        const verifyRole = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    router.push('/dashboard');
                    return;
                }
                const data = await res.json();
                if (data.user?.role !== 'EJECUTIVO') {
                    router.push('/dashboard');
                    return;
                }
                setIsAuthorized(true);
            } catch {
                router.push('/dashboard');
            }
        };
        verifyRole();
    }, [router]);

    // ============================================
    // LOAD USERS
    // ============================================

    const loadUsers = async () => {
        try {
            const data = await listUsers();
            setUsers(data as unknown as UserRow[]);
        } catch {
            // If not authorized, redirect silently
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            loadUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthorized]);

    // ============================================
    // HANDLERS
    // ============================================

    const flash = (type: 'ok' | 'err', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleCreate = () => {
        if (!newName.trim() || !newPin || newPin.length < 4) {
            flash('err', 'Completa nombre y PIN (4-6 dígitos)');
            return;
        }
        startTransition(async () => {
            const res = await createUser({ name: newName.trim(), role: newRole, pin: newPin });
            if (res.success) {
                flash('ok', `${newName} creado exitosamente`);
                setNewName(''); setNewPin(''); setShowCreate(false);
                await loadUsers();
            } else {
                flash('err', res.error || 'Error al crear');
            }
        });
    };

    const handleRoleChange = (userId: string, role: string) => {
        startTransition(async () => {
            const res = await changeUserRole({ userId, role });
            if (res.success) {
                flash('ok', 'Rol actualizado');
                await loadUsers();
            } else {
                flash('err', res.error || 'Error');
            }
        });
    };

    const handleResetPin = (userId: string) => {
        if (!resetPinValue || resetPinValue.length < 4) {
            flash('err', 'PIN debe tener 4-6 dígitos');
            return;
        }
        startTransition(async () => {
            const res = await resetUserPin({ userId, newPin: resetPinValue });
            if (res.success) {
                flash('ok', 'PIN reseteado');
                setResetTarget(null); setResetPinValue('');
            } else {
                flash('err', res.error || 'Error');
            }
        });
    };

    const handleToggleStatus = (userId: string) => {
        startTransition(async () => {
            const res = await toggleUserStatus(userId);
            if (res.success) {
                flash('ok', `Usuario ${res.newStatus === 'ACTIVE' ? 'activado' : 'desactivado'}`);
                await loadUsers();
            } else {
                flash('err', res.error || 'Error');
            }
        });
    };

    // ============================================
    // RENDER
    // ============================================

    // P0-6 Fix: Don't render until authorized
    if (!isAuthorized || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="h-6 w-6 text-amber-600" />
                            Administrar Usuarios
                        </h1>
                        <p className="text-sm text-muted-foreground">Solo accesible por Ejecutivos</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)} className="bg-amber-600 hover:bg-amber-700">
                    <UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario
                </Button>
            </div>

            {/* Flash message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium animate-in fade-in ${message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Create user form */}
            {showCreate && (
                <Card className="border-amber-200 bg-amber-50/30 animate-in slide-in-from-top-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Crear Usuario</CardTitle>
                        <CardDescription>El nuevo usuario podrá iniciar sesión con su PIN</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label>Nombre</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre" />
                            </div>
                            <div className="space-y-1">
                                <Label>Rol</Label>
                                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="BENEFICIARIO">Beneficiario</option>
                                    <option value="GESTOR">Gestor</option>
                                    <option value="EJECUTIVO">Ejecutivo</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>PIN (4-6 dígitos)</Label>
                                <Input type="password" inputMode="numeric" maxLength={6} value={newPin}
                                    onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setNewPin(e.target.value); }}
                                    placeholder="••••" />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleCreate} disabled={isPending} className="w-full bg-amber-600 hover:bg-amber-700">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Users table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left p-4 text-sm font-medium">Usuario</th>
                                    <th className="text-left p-4 text-sm font-medium">Rol</th>
                                    <th className="text-left p-4 text-sm font-medium">Estado</th>
                                    <th className="text-left p-4 text-sm font-medium hidden md:table-cell">Último acceso</th>
                                    <th className="text-right p-4 text-sm font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium">{u.name}</div>
                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                                disabled={isPending}
                                                className={`text-xs px-2 py-1 rounded-full border font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}
                                            >
                                                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {u.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </span>
                                            {u.failedLoginAttempts > 0 && (
                                                <span className="ml-1 text-xs text-orange-600">⚠ {u.failedLoginAttempts} intentos</span>
                                            )}
                                        </td>
                                        <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">
                                            {u.lastLoginAt
                                                ? new Date(u.lastLoginAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : 'Nunca'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-1 justify-end">
                                                {/* Reset PIN */}
                                                {resetTarget === u.id ? (
                                                    <div className="flex gap-1 items-center">
                                                        <Input
                                                            type="password"
                                                            inputMode="numeric"
                                                            maxLength={6}
                                                            value={resetPinValue}
                                                            onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setResetPinValue(e.target.value); }}
                                                            placeholder="Nuevo PIN"
                                                            className="w-24 h-8 text-sm"
                                                        />
                                                        <Button size="sm" variant="default" className="h-8 bg-blue-600"
                                                            onClick={() => handleResetPin(u.id)} disabled={isPending}>
                                                            OK
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8"
                                                            onClick={() => { setResetTarget(null); setResetPinValue(''); }}>
                                                            ✕
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="outline" className="h-8 text-xs"
                                                        onClick={() => setResetTarget(u.id)} title="Reset PIN">
                                                        <Key className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {/* Toggle status */}
                                                <Button size="sm" variant="outline"
                                                    className={`h-8 text-xs ${u.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                    onClick={() => handleToggleStatus(u.id)}
                                                    disabled={isPending}
                                                    title={u.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}>
                                                    {u.status === 'ACTIVE' ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
