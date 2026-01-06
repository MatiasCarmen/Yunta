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
                // Guardar sesión en localStorage para persistencia básica
                localStorage.setItem('yunta-user-id', selectedUser.id);
                localStorage.setItem('yunta-user-name', selectedUser.name);
                localStorage.setItem('yunta-user-role', selectedUser.role);
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
                {/* Selector de perfiles */}
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        ¿Quién eres?
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Selecciona tu perfil para continuar
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="flex items-center justify-center gap-2 h-14 px-6 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium rounded-lg transition-colors duration-200 border border-emerald-200 hover:border-emerald-300"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                >
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                {user.name.toUpperCase()}
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
                            className="w-full text-center text-3xl font-bold tracking-widest px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
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
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
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
