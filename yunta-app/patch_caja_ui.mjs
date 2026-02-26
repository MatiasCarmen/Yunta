import fs from 'fs';

const p = 'src/app/dashboard/junta/caja/page.tsx';
let d = fs.readFileSync(p, 'utf8');

d = d.replace('rebuildCajaBalances,', 'dryRunRebuildCajaBalances, applyRebuildCajaBalances,');

// Modify handleAuditSaldos
const oldHandle = `  const handleAuditSaldos = async () => {
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
  };`;

const newHandle = `  const handleAuditSaldos = async () => {
    setAuditLoading(true);
    setShowAuditModal(true);
    try {
      const result = await dryRunRebuildCajaBalances();
      if (result.success && result.report) {
         setAuditResults(result.report);
      } else {
         showAlert("error", "Error", result.error || "Fallo en simulación");
         setShowAuditModal(false);
      }
    } catch (e) {
      console.error(e);
      showAlert("error", "Error", "Error al simular saldos");
      setShowAuditModal(false);
    } finally {
      setAuditLoading(false);
    }
  };

  const [applyingAudit, setApplyingAudit] = useState(false);

  const handleApplyAudit = async () => {
    setApplyingAudit(true);
    try {
      const result = await applyRebuildCajaBalances();
      if (result.success && result.report) {
         setAuditResults(result.report); // update with final
         await loadCajaData();
         showAlert("success", "Éxito", "Saldos corregidos y registrados en auditoría.");
      } else {
         showAlert("error", "Error", result.error || "Fallo al aplicar corrección");
      }
    } catch(e) {
      console.error(e);
      showAlert("error", "Error", "Error al aplicar saldos");
    } finally {
      setApplyingAudit(false);
    }
  };`;

d = d.replace(oldHandle, newHandle);

// update UI
const oldUI = `<p className="text-sm text-gray-500 mb-4">
                    Comparación del Saldo Teórico VS Saldos Actuales Matemáticos. (Las diferencias ya se han corregido en la Base de Datos).
                  </p>`;
const newUI = `<p className="text-sm text-gray-500 mb-4">
                    Comparación del Saldo Teórico VS Saldos Actuales Matemáticos. (MODO SIMULACIÓN - Presiona Aplicar para guardar en BD).
                  </p>`;
d = d.replace(oldUI, newUI);

const oldBtn = `<div className="flex justify-end pt-4">
                    <Button onClick={() => setShowAuditModal(false)}>Cerrar Reporte</Button>
                  </div>`;
const newBtn = `<div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAuditModal(false)} disabled={applyingAudit}>Cerrar</Button>
                    <Button onClick={handleApplyAudit} disabled={applyingAudit || !auditResults?.some(r => r.diff !== 0)} className="bg-amber-600 hover:bg-amber-700">
                      {applyingAudit ? "Aplicando..." : "Aplicar Correcciones"}
                    </Button>
                  </div>`;
d = d.replace(oldBtn, newBtn);

fs.writeFileSync(p, d);
console.log('Successfully patched page.tsx');
