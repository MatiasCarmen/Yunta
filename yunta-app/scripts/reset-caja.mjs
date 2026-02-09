/**
 * Script para resetear todos los saldos de caja a 0
 * Ejecutar: node scripts/reset-caja.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Reseteando todos los saldos de caja a S/ 0.00...');

  // Resetear todos los saldos a 0
  await prisma.cajaAccount.updateMany({
    data: {
      saldoActual: 0
    }
  });

  console.log('✅ Todos los saldos reseteados a S/ 0.00');

  // Eliminar todos los movimientos de demostración
  const deleted = await prisma.cajaTransaction.deleteMany({});
  
  console.log(`🗑️  ${deleted.count} movimientos eliminados`);
  console.log('\n💰 Caja lista para empezar desde cero');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
