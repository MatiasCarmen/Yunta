/**
 * Script para inicializar las cuentas de caja
 * Ejecutar: node scripts/init-caja.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏦 Inicializando cuentas de caja...');

  const cuentasExistentes = await prisma.cajaAccount.count();

  if (cuentasExistentes > 0) {
    console.log(`✅ Ya existen ${cuentasExistentes} cuentas de caja.`);
    return;
  }

  const cuentasACrear = [
    { tipoCuenta: 'YAPE_SEBASTIAN', nombre: 'Yape Sebastian' },
    { tipoCuenta: 'YAPE_PILAR', nombre: 'Yape Pilar' },
    { tipoCuenta: 'YAPE_STHEFANY', nombre: 'Yape Sthefany' },
    { tipoCuenta: 'TRANSFERENCIA_SEBASTIAN', nombre: 'Transferencia Sebastian' },
    { tipoCuenta: 'TRANSFERENCIA_STHEFANY', nombre: 'Transferencia Sthefany' },
    { tipoCuenta: 'EFECTIVO', nombre: 'Efectivo' }
  ];

  for (const cuenta of cuentasACrear) {
    await prisma.cajaAccount.create({
      data: {
        tipoCuenta: cuenta.tipoCuenta,
        saldoActual: 0,
        umbralAlerta: 100,
        notas: `Cuenta de ${cuenta.nombre}`
      }
    });
    console.log(`✅ Cuenta creada: ${cuenta.nombre}`);
  }

  console.log('🎉 ¡Cuentas de caja inicializadas exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
