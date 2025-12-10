'use client';

// ============================================
// YUNTA - Profile Selector (Client Component)
// ============================================
// Selector interactivo de perfiles con formulario de PIN
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/database';

// ============================================
// TIPOS
// ============================================

interface User {
    id: string;
    name: string;
    avatar: string | null;
    role: Role;
}

interface ProfileSelectorProps {
    users: User[];
}

// ============================================
// CONSTANTES
// ============================================

const ROLE_COLORS = {
    EJECUTIVO: 'from-purple-500 to-indigo-600',
    GESTOR: 'from-blue-500 to-cyan-600',
    BENEFICIARIO: 'from-green-500 to-emerald-600',
};

const ROLE_LABELS = {
    EJECUTIVO: 'Ejecutivo',
    GESTOR: 'Gestor',
    BENEFICIARIO: 'Beneficiario',
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ProfileSelector({ users }: ProfileSelectorProps) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // =========================================
    // HANDLERS
    // =========================================

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setPin('');
        setError('');
    };

    const handleBack = () => {
        setSelectedUser(null);
        setPin('');
        setError('');
    };

    const handlePinChange = (value: string) => {
        // Solo permitir dígitos y máximo 6 caracteres
        if (/^\d{0,6}$/.test(value)) {
            setPin(value);
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUser || !pin) return;

        if (pin.length < 4) {
            setError('El PIN debe tener al menos 4 dígitos');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    pin,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login exitoso - redirigir al dashboard
                // TODO: Guardar sesión
                router.push('/dashboard');
            } else {
                // Login fallido
                setError(data.message || 'Error al iniciar sesión');
                setPin('');
            }
        } catch (err) {
            setError('Error de conexión. Intenta de nuevo.');
            console.error('Error en login:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================
    // VISTA: SELECTOR DE PERFILES
    // =========================================

    if (!selectedUser) {
        return (
            <div className="text-center">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-800 mb-3">
                        YUNTA
                    </h1>
                    <p className="text-xl text-gray-600">
                        Gestión Financiera Familiar
                    </p>
                </div>

                {/* Selector de perfiles */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-8">
                        ¿Quién eres?
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                                style={{
                                    backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                                }}
                                data-role={user.role}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${ROLE_COLORS[user.role]} opacity-90`} />

                                <div className="relative z-10">
                                    {/* Avatar */}
                                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="h-full w-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-4xl font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Nombre */}
                                    <h3 className="text-xl font-bold mb-2">{user.name}</h3>

                                    {/* Rol */}
                                    <p className="text-sm opacity-90">
                                        {ROLE_LABELS[user.role]}
                                    </p>
                                </div>

                                {/* Efecto hover */}
                                <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // =========================================
    // VISTA: FORMULARIO DE PIN
    // =========================================

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
                {/* Header con botón de regreso */}
                <div className="flex items-center mb-8">
                    <button
                        onClick={handleBack}
                        className="mr-4 text-gray-600 hover:text-gray-800 transition-colors"
                        aria-label="Volver"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-2xl font-bold text-gray-800">
                            Bienvenido, {selectedUser.name}
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Ingresa tu PIN
                        </p>
                    </div>
                </div>

                {/* Formulario de PIN */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => handlePinChange(e.target.value)}
                            placeholder="••••"
                            className="w-full text-center text-3xl font-bold tracking-widest px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm text-center">{error}</p>
                        </div>
                    )}

                    {/* Botón de submit */}
                    <button
                        type="submit"
                        disabled={pin.length < 4 || isLoading}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                    >
                        {isLoading ? 'Verificando...' : 'Ingresar'}
                    </button>
                </form>

                {/* Hint de PIN */}
                <p className="text-center text-sm text-gray-500 mt-4">
                    PIN de 4 a 6 dígitos
                </p>
            </div>
        </div>
    );
}
