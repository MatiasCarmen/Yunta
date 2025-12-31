import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const userData = [
    {
        name: 'Matías',
        email: 'matias@yunta.local',
        role: 'EJECUTIVO',
        pinHash: '$2b$10$c.1.28V2uXNoI8UvcAzNyOGHnYP7GcR.X.1M2VUcYrMe/BJVQjrS6', // PIN 1234
        status: 'ACTIVE'
    },
    {
        name: 'Tomás',
        email: 'tomas@yunta.local',
        role: 'GESTOR',
        pinHash: '$2b$10$cxUxC/8yfQo9k5gs9SySH.tv04pUiL0BJSs0FG/vcOrclPDFpqqdi', // PIN 2345
        status: 'ACTIVE'
    },
    {
        name: 'Pilar',
        email: 'pilar@yunta.local',
        role: 'GESTOR',
        pinHash: '$2b$10$ig.vZt4obIBj21sjvGOcyu2J7BvLlfqcdxlNV3toaoDX3hKlD/yve', // PIN 3456
        status: 'ACTIVE'
    },
    {
        name: 'Ariana',
        email: 'ariana@yunta.local',
        role: 'BENEFICIARIO',
        pinHash: '$2b$10$bXID8MeH3UUSN2R391F8SuZevwI5NMZYb7Q8HJmy80bL3vKIqvIQW', // PIN 4567
        status: 'ACTIVE'
    },
    {
        name: 'Sthefany',
        email: 'sthefany@yunta.local',
        role: 'BENEFICIARIO',
        pinHash: '$2b$10$tmSfMRAqkaexHDdtyYecVeMVA9zn.I45AZR3QesNP3McI8Q50bB8W', // PIN 5678
        status: 'ACTIVE'
    }
];

async function main() {
    console.log(`\n🌱 Empezando la siembra de usuarios...`);

    for (const user of userData) {
        const createdUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                role: user.role as any, // Cast as any to bypass strict enum type check in seed script
                pinHash: user.pinHash,
                status: user.status as any
            },
            create: {
                name: user.name,
                email: user.email,
                role: user.role as any,
                pinHash: user.pinHash,
                status: user.status as any
            },
        });
        console.log(`✅ Creado/Actualizado usuario: ${createdUser.name}`);
    }

    console.log(`\n✅ Siembra completada.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
