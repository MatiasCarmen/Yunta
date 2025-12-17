// scripts/seed.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const userData = [
    {
        name: 'Matías',
        email: 'matias@yunta.local',
        role: 'EJECUTIVO',
        pinHash: '$2b$10$c.1.28V2uXNoI8UvcAzNyOGHnYP7GcR.X.1M2VUcYrMe/BJVQjrS6',
        status: 'ACTIVE'
    },
    {
        name: 'Tomás',
        email: 'tomas@yunta.local',
        role: 'GESTOR',
        pinHash: '$2b$10$cxUxC/8yfQo9k5gs9SySH.tv04pUiL0BJSs0FG/vcOrclPDFpqqdi',
        status: 'ACTIVE'
    },
    {
        name: 'Pilar',
        email: 'pilar@yunta.local',
        role: 'GESTOR',
        pinHash: '$2b$10$ig.vZt4obIBj21sjvGOcyu2J7BvLlfqcdxlNV3toaoDX3hKlD/yve',
        status: 'ACTIVE'
    },
    {
        name: 'Ariana',
        email: 'ariana@yunta.local',
        role: 'BENEFICIARIO',
        pinHash: '$2b$10$bXID8MeH3UUSN2R391F8SuZevwI5NMZYb7Q8HJmy80bL3vKIqvIQW',
        status: 'ACTIVE'
    },
    {
        name: 'Sthefany',
        email: 'sthefany@yunta.local',
        role: 'BENEFICIARIO',
        pinHash: '$2b$10$tmSfMRAqkaexHDdtyYecVeMVA9zn.I45AZR3QesNP3McI8Q50bB8W',
        status: 'ACTIVE'
    }
];

async function main() {
    console.log(`\n🌱 Empezando la siembra de usuarios (Modo JS Puro)...`);

    // Verificar conexión
    console.log(`🔌 Conectando a BD: ${process.env.DATABASE_URL.split('@')[1]}...`);

    for (const user of userData) {
        const createdUser = await prisma.user.upsert({
            where: { email: user.email },
            update: { ...user },
            create: { ...user },
        });
        console.log(`✅ Creado/Actualizado: ${createdUser.name} (${createdUser.role})`);
    }

    console.log(`\n✅ Siembra completada exitosamente.`);
}

main()
    .catch((e) => {
        console.error('❌ Error fatal:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
