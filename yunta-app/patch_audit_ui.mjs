import fs from 'fs';

const p = 'src/app/dashboard/junta/caja/page.tsx';
let d = fs.readFileSync(p, 'utf8');

// 1. Add Activity to lucide-react if missing
if (!d.includes('Activity,')) {
    d = d.replace('AlertTriangle, X, Filter }', 'AlertTriangle, X, Filter, Activity }');
}

// 2. States for audit
if (!d.includes('showAuditModal')) {
    d = d.replace(
        'const [showFilterModal, setShowFilterModal] = useState(false);',
        'const [showFilterModal, setShowFilterModal] = useState(false);\n  const [showAuditModal, setShowAuditModal] = useState(false);\n  const [auditLoading, setAuditLoading] = useState(false);\n  const [auditResults, setAuditResults] = useState<RebuildReportItem[] | null>(null);'
    );
}

// 3. handleAuditSaldos
if (!d.includes('handleAuditSaldos')) {
    const fn = `
  const handleAuditSaldos = async () => {
    setAuditLoading(true);
    setShowAuditModal(true);
    try {
      const result = await rebuildCajaBalances();
      if (result.success && result.report) {
         setAuditResults(result.report);
         await loadCajaData();
      } else {
         showAlert("error", "Error", result.error || "Fallo en auditoría");
         setShowAuditModal(false);
      }
    } catch (e) {
      console.error(e);
      showAlert("error", "Error", "Error al reconstruir saldos");
      setShowAuditModal(false);
    } finally {
      setAuditLoading(false);
    }
  };
    `;
    d = d.replace(
        'const totalCaja = cuentas.reduce((sum, c) => sum + Number(c.saldo), 0);',
        fn + '\n  const totalCaja = cuentas.reduce((sum, c) => sum + Number(c.saldo), 0);'
    );
}

// 4. Button
if (!d.includes('Recalcular saldos')) {
    const btn = `
          <Button variant="outline" onClick={handleAuditSaldos} disabled={auditLoading}>
            <Activity className="h-4 w-4 mr-2" />
            Recalcular saldos
          </Button>
          <Button variant="outline">
    `;
    d = d.replace('<Button variant="outline">\n            <Download className="h-4 w-4 mr-2" />', btn.trim() + '\n            <Download className="h-4 w-4 mr-2" />');
}

// 5. Modal render
if (!d.includes('Modal de Auditoria')) {
    const modal = `
      {/* Modal de Auditoria */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl animate-in fade-in zoom-in duration-200 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Auditoría de Saldos Reales
              </CardTitle>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                disabled={auditLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                 <div className="flex flex-col items-center justify-center py-8">
                   <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                   <p className="text-gray-600">Reconstruyendo e igualando saldos con blockchain interno...</p>
                 </div>
              ) : auditResults ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Comparación del Saldo Teórico VS Saldos Actuales Matemáticos. (Las diferencias ya se han corregido en la Base de Datos).
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                        <tr>
                          <th className="px-4 py-3">Cuenta (ID)</th>
                          <th className="px-4 py-3">Saldo Previo</th>
                          <th className="px-4 py-3">Recalculado</th>
                          <th className="px-4 py-3">Variación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditResults.map(item => (
                          <tr key={item.accountId} className={item.diff !== 0 ? 'bg-amber-50/50' : 'bg-white'}>
                            <td className="px-4 py-3 font-medium">
                              {getCuentaLabel(item.tipoCuenta)}
                              <div className="text-xs text-gray-400 font-normal">{item.accountId.slice(0, 8)}</div>
                            </td>
                            <td className="px-4 py-3">S/ {item.saldoPrevio.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-bold">S/ {item.saldoRecalculado.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              {item.diff === 0 ? (
                                 <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ok</span>
                              ) : (
                                 <span className="text-amber-600 flex items-center gap-1 font-bold"><AlertTriangle className="w-3 h-3"/> {item.diff > 0 ? '+' : ''}{item.diff.toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setShowAuditModal(false)}>Cerrar Reporte</Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    `;
    d = d.replace('{/* Modal de Transferencia */}', modal + '\n      {/* Modal de Transferencia */}');
}

fs.writeFileSync(p, d);
console.log('UI Patched!');
