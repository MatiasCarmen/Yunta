"use server";

import { prisma } from "@/database";
import { CuentaDestino, TipoMovimientoCaja, ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

// ============================================
// TIPOS
// ============================================

// Re-exportar ExpenseCategory para uso en componentes cliente
export type { ExpenseCategory } from "@prisma/client";

export type CuentaCaja = {
  id: string;
  tipoCuenta: string;
  saldo: number;
  umbralAlerta: number;
  notas: string | null;
  ultimaActualizacion: Date;
};

export type MovimientoCaja = {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string;
  fecha: Date;
  beneficiario: string | null;
  notas: string | null;
  cuentaOrigenNombre: string | null;
  cuentaDestinoNombre: string | null;
};

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene el estado actual de todas las cuentas de caja
 */
export async function getCajaActual(): Promise<CuentaCaja[]> {
  try {
    await requireRole(['EJECUTIVO', 'GESTOR']);
    const cuentas = await prisma.cajaAccount.findMany({
      orderBy: { tipoCuenta: "asc" }
    });

    return cuentas.map((cuenta) => ({
      id: cuenta.id,
      tipoCuenta: cuenta.tipoCuenta,
      saldo: Number(cuenta.saldoActual),
      umbralAlerta: Number(cuenta.umbralAlerta),
      notas: cuenta.notas,
      ultimaActualizacion: cuenta.ultimaActualizacion
    }));
  } catch (error) {
    console.error("Error obteniendo caja actual:", error);
    throw new Error("No se pudo obtener el estado de caja");
  }
}

/**
 * Obtiene el historial de movimientos de caja
 */
export async function getCajaHistorial(
  juntaId: string,
  limit = 50
): Promise<MovimientoCaja[]> {
  try {
    await requireRole(['EJECUTIVO', 'GESTOR']);
    const movimientos = await prisma.cajaTransaction.findMany({
      include: {
        cuentaOrigen: true,
        cuentaDestino: true
      },
      orderBy: { fecha: "desc" },
      take: limit
    });

    return movimientos.map((mov) => ({
      id: mov.id,
      tipo: mov.tipo,
      monto: Number(mov.monto),
      descripcion: mov.descripcion,
      fecha: mov.fecha,
      beneficiario: mov.beneficiario,
      notas: mov.notas,
      cuentaOrigenNombre: mov.cuentaOrigen
        ? getCuentaLabel(mov.cuentaOrigen.tipoCuenta)
        : null,
      cuentaDestinoNombre: mov.cuentaDestino
        ? getCuentaLabel(mov.cuentaDestino.tipoCuenta)
        : null
    }));
  } catch (error) {
    console.error("Error obteniendo historial de caja:", error);
    throw new Error("No se pudo obtener el historial de caja");
  }
}

/**
 * Mueve dinero entre dos cuentas
 */
export async function moverDinero(
  cuentaOrigenId: string,
  cuentaDestinoId: string,
  monto: number,
  descripcion: string,
  notas?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(['EJECUTIVO', 'GESTOR']);
    // Validar que las cuentas existan y tengan saldo suficiente
    const cuentaOrigen = await prisma.cajaAccount.findUnique({
      where: { id: cuentaOrigenId }
    });

    if (!cuentaOrigen) {
      return { success: false, message: "Cuenta de origen no encontrada" };
    }

    if (Number(cuentaOrigen.saldoActual) < monto) {
      return { success: false, message: "Saldo insuficiente en cuenta de origen" };
    }

    // Realizar la transferencia en una transacción
    await prisma.$transaction(async (tx) => {
      // Descontar de cuenta origen
      await tx.cajaAccount.update({
        where: { id: cuentaOrigenId },
        data: { saldoActual: { decrement: monto } }
      });

      // Agregar a cuenta destino
      await tx.cajaAccount.update({
        where: { id: cuentaDestinoId },
        data: { saldoActual: { increment: monto } }
      });

      // Registrar el movimiento
      await tx.cajaTransaction.create({
        data: {
          tipo: TipoMovimientoCaja.TRANSFERENCIA,
          monto,
          descripcion,
          notas,
          cuentaOrigenId,
          cuentaDestinoId,
          fecha: new Date()
        }
      });
    });

    revalidatePath("/dashboard/junta/caja");
    return { success: true, message: "Transferencia realizada exitosamente" };
  } catch (error) {
    console.error("Error moviendo dinero:", error);
    return { success: false, message: "Error al realizar la transferencia" };
  }
}

/**
 * Registra un gasto o egreso de dinero
 */
export async function registrarGasto(
  cuentaId: string,
  monto: number,
  descripcion: string,
  beneficiario?: string,
  categoria?: ExpenseCategory,
  notas?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(['EJECUTIVO', 'GESTOR']);
    // Validar que la cuenta exista y tenga saldo suficiente
    const cuenta = await prisma.cajaAccount.findUnique({
      where: { id: cuentaId }
    });

    if (!cuenta) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    if (Number(cuenta.saldoActual) < monto) {
      return { success: false, message: "Saldo insuficiente en la cuenta" };
    }

    // Realizar el egreso en una transacción
    await prisma.$transaction(async (tx) => {
      // Descontar de la cuenta
      await tx.cajaAccount.update({
        where: { id: cuentaId },
        data: { saldoActual: { decrement: monto } }
      });

      // Registrar el movimiento
      await tx.cajaTransaction.create({
        data: {
          tipo: TipoMovimientoCaja.EGRESO,
          monto,
          descripcion,
          beneficiario,
          categoria,
          notas,
          cuentaOrigenId: cuentaId,
          fecha: new Date()
        }
      });
    });

    revalidatePath("/dashboard/junta/caja");
    return { success: true, message: "Gasto registrado exitosamente" };
  } catch (error) {
    console.error("Error registrando gasto:", error);
    return { success: false, message: "Error al registrar el gasto" };
  }
}

/**
 * Registra un ingreso de dinero (cuando alguien paga a una cuenta)
 */
export async function registrarIngreso(
  cuentaId: string,
  monto: number,
  descripcion: string,
  juntaPaymentId?: string,
  notas?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(['EJECUTIVO', 'GESTOR']);
    await prisma.$transaction(async (tx) => {
      // Agregar a la cuenta
      await tx.cajaAccount.update({
        where: { id: cuentaId },
        data: { saldoActual: { increment: monto } }
      });

      // Registrar el movimiento
      await tx.cajaTransaction.create({
        data: {
          tipo: TipoMovimientoCaja.INGRESO,
          monto,
          descripcion,
          notas,
          juntaPaymentId,
          cuentaDestinoId: cuentaId,
          fecha: new Date()
        }
      });
    });

    revalidatePath("/dashboard/junta/caja");
    return { success: true, message: "Ingreso registrado exitosamente" };
  } catch (error) {
    console.error("Error registrando ingreso:", error);
    return { success: false, message: "Error al registrar el ingreso" };
  }
}

/**
 * Obtiene todas las cuentas disponibles para selección
 */
export async function getCuentasDisponibles(): Promise<
  Array<{ id: string; nombre: string; saldo: number }>
> {
  try {
    const cuentas = await prisma.cajaAccount.findMany({
      orderBy: { tipoCuenta: "asc" }
    });

    return cuentas.map((cuenta) => ({
      id: cuenta.id,
      nombre: getCuentaLabel(cuenta.tipoCuenta),
      saldo: Number(cuenta.saldoActual)
    }));
  } catch (error) {
    console.error("Error obteniendo cuentas disponibles:", error);
    return [];
  }
}

/**
 * Inicializa las cuentas de caja si no existen
 */
export async function inicializarCuentasCaja(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const cuentasExistentes = await prisma.cajaAccount.count();

    if (cuentasExistentes > 0) {
      return {
        success: true,
        message: "Las cuentas ya están inicializadas"
      };
    }

    // Crear las 6 cuentas
    const cuentasACrear = [
      CuentaDestino.YAPE_SEBASTIAN,
      CuentaDestino.YAPE_PILAR,
      CuentaDestino.YAPE_STHEFANY,
      CuentaDestino.TRANSFERENCIA_SEBASTIAN,
      CuentaDestino.TRANSFERENCIA_STHEFANY,
      CuentaDestino.EFECTIVO
    ];

    await prisma.$transaction(
      cuentasACrear.map((tipoCuenta) =>
        prisma.cajaAccount.create({
          data: {
            tipoCuenta,
            saldoActual: 0,
            umbralAlerta: 100
          }
        })
      )
    );

    revalidatePath("/dashboard/junta/caja");
    return {
      success: true,
      message: "Cuentas de caja inicializadas exitosamente"
    };
  } catch (error) {
    console.error("Error inicializando cuentas de caja:", error);
    return {
      success: false,
      message: "Error al inicializar las cuentas de caja"
    };
  }
}

// ============================================
// AUDITORIA Y MANTENIMIENTO
// ============================================

export type RebuildReportItem = {
  accountId: string;
  tipoCuenta: string;
  saldoPrevio: number;
  saldoRecalculado: number;
  diff: number;
};

// Global lock to prevent concurrent rebuilds
let isRebuilding = false;

async function calculateRebuildReport(tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> | typeof prisma = prisma) {
  const report: RebuildReportItem[] = [];
  const cuentas = await tx.cajaAccount.findMany();

  for (const cuenta of cuentas) {
    const originRecords = await tx.cajaTransaction.findMany({
      where: { cuentaOrigenId: cuenta.id }
    });
    const destRecords = await tx.cajaTransaction.findMany({
      where: { cuentaDestinoId: cuenta.id }
    });

    let calculated = 0;
    for (const mov of originRecords) {
      if (mov.tipo === 'EGRESO' || mov.tipo === 'TRANSFERENCIA') calculated -= Number(mov.monto);
    }
    for (const mov of destRecords) {
      if (mov.tipo === 'INGRESO' || mov.tipo === 'TRANSFERENCIA') calculated += Number(mov.monto);
    }

    const saldoPrevio = Number(cuenta.saldoActual);
    const diff = calculated - saldoPrevio;

    report.push({
      accountId: cuenta.id,
      tipoCuenta: cuenta.tipoCuenta,
      saldoPrevio,
      saldoRecalculado: calculated,
      diff
    });
  }
  return report;
}

export async function dryRunRebuildCajaBalances() {
  try {
    const report = await calculateRebuildReport();
    return { success: true, report };
  } catch (error: any) {
    console.error("Error al simular saldos de caja:", error);
    return { success: false, error: String(error) };
  }
}

export async function applyRebuildCajaBalances() {
  if (isRebuilding) return { success: false, error: "Ya hay una reconstrucción en curso." };
  isRebuilding = true;

  try {
    let diffTotal = 0;
    const finalReport = await prisma.$transaction(async (tx) => {
      const report = await calculateRebuildReport(tx);
      const changedAccounts = [];

      for (const item of report) {
        // Sincronizar
        if (item.diff !== 0) {
          diffTotal += Math.abs(item.diff);
          changedAccounts.push({ accountId: item.accountId, diff: item.diff });
          await tx.cajaAccount.update({
            where: { id: item.accountId },
            data: { saldoActual: item.saldoRecalculado }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'REBUILD_CAJA',
          diffTotal,
          details: JSON.stringify(changedAccounts)
        }
      });

      return report;
    });

    revalidatePath("/dashboard/junta/caja");
    revalidatePath("/dashboard/junta");

    return { success: true, report: finalReport };
  } catch (error: any) {
    console.error("Error al aplicar saldos de caja:", error);
    return { success: false, error: String(error) };
  } finally {
    isRebuilding = false;
  }
}

// ============================================
// UTILIDADES
// ============================================

function getCuentaLabel(tipo: CuentaDestino): string {
  const labels: Record<CuentaDestino, string> = {
    YAPE_SEBASTIAN: "Yape Sebastian",
    YAPE_PILAR: "Yape Pilar",
    YAPE_STHEFANY: "Yape Sthefany",
    TRANSFERENCIA_SEBASTIAN: "Transferencia Sebastian",
    TRANSFERENCIA_STHEFANY: "Transferencia Sthefany",
    EFECTIVO: "Efectivo"
  };
  return labels[tipo] || tipo;
}

