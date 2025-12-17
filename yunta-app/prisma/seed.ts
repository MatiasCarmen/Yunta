import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
// Usamos los valores literales de los enums
const Role = {
    EJECUTIVO: 'EJECUTIVO',
    GESTOR: 'GESTOR',
    BENEFICIARIO: 'BENEFICIARIO'
};

const UserStatus = {
    ACTIVE: 'ACTIVE'
};

const prisma = new PrismaClient();

const userData = [
    {
        name: 'Matías',
        email: 'matias@yunta.local',
        role: Role.EJECUTIVO,
        pinHash: '$2b$10$c.1.28V2uXNoI8UvcAzNyOGHnYP7GcR.X.1M2VUcYrMe/BJVQjrS6', // PIN 1234
        status: UserStatus.ACTIVE
    },
    {
        name: 'Tomás',
        email: 'tomas@yunta.local',
        role: Role.GESTOR,
        pinHash: '$2b$10$cxUxC/8yfQo9k5gs9SySH.tv04pUiL0BJSs0FG/vcOrclPDFpqqdi', // PIN 2345
        status: UserStatus.ACTIVE
    },
    {
        name: 'Pilar',
        email: 'pilar@yunta.local',
        role: Role.GESTOR,
        pinHash: '$2b$10$ig.vZt4obIBj21sjvGOcyu2J7BvLlfqcdxlNV3toaoDX3hKlD/yve', // PIN 3456
        status: UserStatus.ACTIVE
    },
    {
        name: 'Ariana',
        email: 'ariana@yunta.local',
        role: Role.BENEFICIARIO,
        pinHash: '$2b$10$bXID8MeH3UUSN2R391F8SuZevwI5NMZYb7Q8HJmy80bL3vKIqvIQW', // PIN 4567
        status: UserStatus.ACTIVE
    },
    {
        name: 'Sthefany',
        email: 'sthefany@yunta.local',
        role: Role.BENEFICIARIO,
        pinHash: '$2b$10$tmSfMRAqkaexHDdtyYecVeMVA9zn.I45AZR3QesNP3McI8Q50bB8W', // PIN 5678
        status: UserStatus.ACTIVE
    }
];

async function main() {
    console.log(`\n🌱 Empezando la siembra de usuarios...`);

    for (const user of userData) {
        // Usa values as const types for TypeScript safety if needed, 
        // but explicit strings work fine with Prisma Client
        const createdUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                role: user.role as any,
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
