// ============================================
// YUNTA - Login Page (Server Component)
// ============================================
// Página de inicio/login con selector de perfil
// Server Component que fetch usuarios y pasa a componente cliente
// ============================================

import { prisma } from '@/database/client';
import ProfileSelector from '@/components/ProfileSelector';
import { redirect } from 'next/navigation';

// ============================================
// FUNCIÓN PARA OBTENER USUARIOS (SERVER-SIDE)
// ============================================

async function getActiveUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
      },
      orderBy: [
        { role: 'desc' }, // EJECUTIVO primero
        { name: 'asc' },  // Alfabético
      ],
    });

    return users;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }
}

// ============================================
// PÁGINA DE LOGIN (SERVER COMPONENT)
// ============================================

export default async function LoginPage() {
  // Fetch usuarios en el servidor
  const users = await getActiveUsers();

  // Si no hay usuarios, mostrar mensaje
  if (users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            No hay usuarios disponibles
          </h1>
          <p className="text-gray-600 mb-4">
            Por favor, crea usuarios en Prisma Studio primero.
          </p>
          <a
            href="http://localhost:51212"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Abrir Prisma Studio
          </a>
        </div>
      </div>
    );
  }

  // Pasar usuarios al componente cliente interactivo
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5E8] px-4">
      {/* Logo de Yunta */}
      <div className="mb-8">
        <img 
          src="/logo-yunta.png" 
          alt="Yunta - Finanzas en Familia" 
          className="w-48 h-auto drop-shadow-lg"
        />
      </div>
      
      <div className="w-full max-w-2xl">
        <ProfileSelector users={users} />
      </div>
    </div>
  );
}

// Metadata para SEO
export const metadata = {
  title: 'YUNTA - Inicio de Sesión',
  description: 'Sistema de gestión financiera familiar',
};

// Revalidar cada 60 segundos (datos frescos sin perder SSR)
export const revalidate = 60;
