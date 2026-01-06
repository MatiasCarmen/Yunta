import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db"
        }
    }
});

async function unlockUser() {
    const email = process.argv[2];
    
    if (!email) {
        console.log('❌ Uso: node scripts/unlock-user.mjs <email>');
        console.log('Ejemplo: node scripts/unlock-user.mjs tomas@yunta.local');
        return;
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                failedLoginAttempts: 0,
                lastLockedAt: null,
            },
        });

        console.log(`✅ Usuario ${user.name} desbloqueado exitosamente!`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

unlockUser();
