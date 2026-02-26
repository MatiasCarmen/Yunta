import fs from 'fs';

const p = 'src/__tests__/juntaSync.test.ts';
let d = fs.readFileSync(p, 'utf8');

const targetStr = `    it('7. rebuildCajaBalances: recalculates correctly and reports diff', async () => {
        const { rebuildCajaBalances } = await import('../app/actions/caja');

        const mockCuentas = [
            { id: 'cta-yape', tipoCuenta: 'YAPE_SEBASTIAN', saldoActual: 100 } // Incorrect saldo
        ];
        
        // Let's say YAPE received 300, and sent 50. True Balance = 250.
        const mockOriginTxs = [
            { tipo: 'EGRESO', monto: 50, cuentaOrigenId: 'cta-yape' }
        ];
        const mockDestTxs = [
            { tipo: 'INGRESO', monto: 300, cuentaDestinoId: 'cta-yape' }
        ];

        (prisma.cajaAccount.findMany as any).mockResolvedValueOnce(mockCuentas);
        
        // Sequence of findMany inside the loop
        (prisma.cajaTransaction.findMany as any)
            .mockResolvedValueOnce(mockOriginTxs) // First call: origin
            .mockResolvedValueOnce(mockDestTxs);  // Second call: dest

        const res = await rebuildCajaBalances();

        expect(res.success).toBe(true);
        expect(res.report?.length).toBe(1);
        expect(res.report![0].diff).toBe(150); // 250 calculated - 100 previous = 150
        expect(res.report![0].saldoRecalculado).toBe(250);
        
        // Verify update was called to correct the mathematical reality
        expect(prisma.cajaAccount.update).toHaveBeenCalledWith({
            where: { id: 'cta-yape' },
            data: { saldoActual: 250 }
        });
    });`;

const replacementStr = `    it('7. dryRunRebuildCajaBalances no cambia DB, y applyRebuildCajaBalances guarda log', async () => {
        const { dryRunRebuildCajaBalances, applyRebuildCajaBalances } = await import('../app/actions/caja');

        const mockCuentas = [
            { id: 'cta-yape', tipoCuenta: 'YAPE_SEBASTIAN', saldoActual: 100 } // Incorrect saldo
        ];
        
        // True Balance = 250
        const mockOriginTxs = [ { tipo: 'EGRESO', monto: 50, cuentaOrigenId: 'cta-yape' } ];
        const mockDestTxs = [ { tipo: 'INGRESO', monto: 300, cuentaDestinoId: 'cta-yape' } ];

        (prisma.cajaAccount.findMany as any).mockResolvedValueOnce(mockCuentas);
        (prisma.cajaTransaction.findMany as any)
            .mockResolvedValueOnce(mockOriginTxs) 
            .mockResolvedValueOnce(mockDestTxs);

        const dryRes = await dryRunRebuildCajaBalances();

        expect(dryRes.success).toBe(true);
        expect(dryRes.report![0].diff).toBe(150); 
        expect(prisma.cajaAccount.update).not.toHaveBeenCalled();

        (prisma.cajaAccount.findMany as any).mockResolvedValueOnce(mockCuentas);
        (prisma.cajaTransaction.findMany as any)
            .mockResolvedValueOnce(mockOriginTxs) 
            .mockResolvedValueOnce(mockDestTxs);

        const applyRes = await applyRebuildCajaBalances();

        expect(applyRes.success).toBe(true);
        expect(prisma.cajaAccount.update).toHaveBeenCalledWith({
            where: { id: 'cta-yape' },
            data: { saldoActual: 250 }
        });
        expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('8. lock system prevents double applyRebuildCajaBalances concurrently', async () => {
        const { applyRebuildCajaBalances } = await import('../app/actions/caja');

        const mockCuentas = [ { id: 'cta-eff', tipoCuenta: 'EFECTIVO', saldoActual: 0 } ];
        (prisma.cajaAccount.findMany as any).mockResolvedValue(mockCuentas);
        (prisma.cajaTransaction.findMany as any).mockResolvedValue([]);

        // Force a slow transaction to hold the lock
        (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => {
            return new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await cb(prisma));
                }, 500); 
            });
        });

        const p1 = applyRebuildCajaBalances();
        const p2 = applyRebuildCajaBalances();

        const [r1, r2] = await Promise.all([p1, p2]);

        expect(r1.success).toBe(true);
        expect(r2.success).toBe(false);
        expect(r2.error).toMatch(/en curso/);
    });`;

if (d.includes(targetStr)) {
    d = d.replace(targetStr, replacementStr);
    fs.writeFileSync(p, d);
    console.log('Successfully patched juntaSync.test.ts');
} else {
    console.error('Target string not found in juntaSync.test.ts');
}
