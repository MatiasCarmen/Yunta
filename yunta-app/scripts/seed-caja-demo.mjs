/**
 * Script para agregar datos de demostración a las cuentas de caja
 * Ejecutar: node scripts/seed-caja-demo.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💰 Agregando datos de demostración a la caja...');

  // Obtener todas las cuentas
  const cuentas = await prisma.cajaAccount.findMany();

  if (cuentas.length === 0) {
    console.log('❌ No hay cuentas de caja. Ejecuta primero: node scripts/init-caja.mjs');
    return;
  }

  // Simular algunos saldos iniciales
  const saldosIniciales = {
    YAPE_SEBASTIAN: 1500.50,
    YAPE_PILAR: 800.00,
    YAPE_STHEFANY: 2300.75,
    TRANSFERENCIA_SEBASTIAN: 5000.00,
    TRANSFERENCIA_STHEFANY: 3200.00,
    EFECTIVO: 450.00
  };

  for (const cuenta of cuentas) {
    const saldoInicial = saldosIniciales[cuenta.tipoCuenta] || 0;
    
    await prisma.cajaAccount.update({
      where: { id: cuenta.id },
      data: { saldoActual: saldoInicial }
    });

    console.log(`✅ ${cuenta.tipoCuenta}: S/ ${saldoInicial.toFixed(2)}`);
  }

  // Crear algunos movimientos de demostración
  console.log('\n📝 Creando movimientos de demostración...');

  const yapeSebasId = cuentas.find(c => c.tipoCuenta === 'YAPE_SEBASTIAN')?.id;
  const yapePilarId = cuentas.find(c => c.tipoCuenta === 'YAPE_PILAR')?.id;
  const efectivoId = cuentas.find(c => c.tipoCuenta === 'EFECTIVO')?.id;

  if (yapeSebasId && yapePilarId) {
    // Ingreso de ejemplo
    await prisma.cajaTransaction.create({
      data: {
        tipo: 'INGRESO',
        monto: 500,
        descripcion: 'Pago de junta recibido - Participante A',
        cuentaDestinoId: yapeSebasId,
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Hace 2 días
      }
    });
    console.log('✅ Ingreso creado: Pago de junta S/ 500');

    // Transferencia de ejemplo
    await prisma.cajaTransaction.create({
      data: {
        tipo: 'TRANSFERENCIA',
        monto: 300,
        descripcion: 'Consolidación de fondos',
        cuentaOrigenId: yapeSebasId,
        cuentaDestinoId: yapePilarId,
        fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
        notas: 'Transferencia para distribución'
      }
    });
    console.log('✅ Transferencia creada: S/ 300');
  }

  if (efectivoId) {
    // Egreso de ejemplo
    await prisma.cajaTransaction.create({
      data: {
        tipo: 'EGRESO',
        monto: 150,
        descripcion: 'Pago a beneficiario del día',
        cuentaOrigenId: efectivoId,
        beneficiario: 'Juan Pérez',
        categoria: 'PAYROLL',
        fecha: new Date(), // Hoy
        notas: 'Pago correspondiente al turno del día'
      }
    });
    console.log('✅ Egreso creado: Pago a beneficiario S/ 150');
  }

  console.log('\n🎉 ¡Datos de demostración agregados exitosamente!');
  console.log('\n📊 Resumen de saldos:');
  
  const totalGeneral = Object.values(saldosIniciales).reduce((sum, val) => sum + val, 0);
  console.log(`💰 Total en caja: S/ ${totalGeneral.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
