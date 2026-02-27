
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Sembrando usuarios en PostgreSQL...');

    const users = [
        { name: 'Matías', email: 'matias@yunta.local', role: 'EJECUTIVO' },
        { name: 'Tomás', email: 'tomas@yunta.local', role: 'GESTOR' },
        { name: 'Pilar', email: 'pilar@yunta.local', role: 'GESTOR' },
        { name: 'Ariana', email: 'ariana@yunta.local', role: 'BENEFICIARIO' },
        { name: 'Sthefany', email: 'sthefany@yunta.local', role: 'BENEFICIARIO' },
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                name: u.name,
                email: u.email,
                role: u.role,
                status: 'ACTIVE',
                pinHash: '$2b$10$c.1.28V2uXNoI8UvcAzNyOGHnYP7GcR.X.1M2VUcYrMe/BJVQjrS6', // PIN: 1234
            },
        });
        console.log(`✅ ${u.name} listo.`);
    }

    console.log('\n📋 Usuarios creados:');
    console.log('  matias@yunta.local  → PIN: 1234 (EJECUTIVO)');
    console.log('  tomas@yunta.local   → PIN: 1234 (GESTOR)');
    console.log('  pilar@yunta.local   → PIN: 1234 (GESTOR)');
    console.log('  ariana@yunta.local  → PIN: 1234 (BENEFICIARIO)');
    console.log('  sthefany@yunta.local → PIN: 1234 (BENEFICIARIO)');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
