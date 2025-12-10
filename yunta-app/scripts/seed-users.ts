// Script para crear usuarios iniciales de YUNTA
// Ejecutar con: node --import tsx scripts/seed-users.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const INITIAL_USERS = [
    {
        name: 'Matías',
        role: 'EJECUTIVO' as const,
        pin: '1234', // PIN de prueba
        email: 'matias@yunta.local',
    },
    {
        name: 'Tomás',
        role: 'GESTOR' as const,
        pin: '2345', // PIN de prueba
        email: 'tomas@yunta.local',
    },
    {
        name: 'Pilar',
        role: 'GESTOR' as const,
        pin: '3456', // PIN de prueba
        email: 'pilar@yunta.local',
    },
    {
        name: 'Ariana',
        role: 'BENEFICIARIO' as const,
        pin: '4567', // PIN de prueba
        email: 'ariana@yunta.local',
    },
    {
        name: 'Sthefany',
        role: 'BENEFICIARIO' as const,
        pin: '5678', // PIN de prueba
        email: 'sthefany@yunta.local',
    },
];

async function main() {
    console.log('Iniciando seed de usuarios...\n');

    for (const userData of INITIAL_USERS) {
        // Hashear el PIN
        const pinHash = await bcrypt.hash(userData.pin, 10);

        // Crear usuario
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                pinHash,
            },
        });

        console.log(`✓ Usuario creado: ${user.name} (${user.role}) - PIN de prueba: ${userData.pin}`);
    }

    console.log('\n✅ Seed completado! Los 5 usuarios están listos.');
    console.log('\nPuedes verificarlos en Prisma Studio: http://localhost:51212');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
