import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/const handleAddTransaction = async \(txData: TransactionInput\) => \{[\s\S]*?alert\('Error al registrar el pago'\);\s*\}\s*\};/,
    `  const [offlineStats, setOfflineStats] = useState({ pending: 0, failed: 0 });

  const loadOfflineStats = async () => {
     const pendings = await getPendingPayments();
     setOfflineStats({
        pending: pendings.filter(p => p.status === 'PENDING').length,
        failed: pendings.filter(p => p.status === 'FAILED').length
     });
  };

  useEffect(() => {
     loadOfflineStats();
  }, []);

  const handleRetrySync = async () => {
    setLoadingState({ isLoading: true, message: 'Reintentando sync...' });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('online'));
    }
    setTimeout(() => {
        loadOfflineStats();
        setLoadingState({ isLoading: false, message: '' });
    }, 2000);
  };

  const handleDiscardFailed = async () => {
     const pendings = await getPendingPayments();
     for (const p of pendings) {
         if (p.status === 'FAILED' && p.id) {
             await deletePending(p.id);
         }
     }
     loadOfflineStats();
  };

  useJuntaSync(junta.id, async () => {
    const updated = await getActiveJunta();
    if (updated) onUpdate(updated);
    loadOfflineStats();
  });

  const handleAddTransaction = async (txData: TransactionInput) => {
    const clientTxId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const txPayload = { ...txData, clientTxId };

    if (!navigator.onLine) {
       await enqueuePendingPayment(txPayload);
       setAlertDialog({
         isOpen: true,
         title: 'Encolado Offline',
         message: 'No hay conexión. El pago se guardó y se sincronizará automáticamente cuando vuelva internet.',
         type: 'info'
       });
       setTimeout(() => setAlertDialog(null), 3000);
       setShowPayModal(null);
       loadOfflineStats();
       return;
    }

    try {
      setLoadingState({ isLoading: true, message: 'Procesando pago...' });
      const res = await recordPayment(junta.id, txPayload);
      
      if (!res.success) {
         throw new Error(res.error || 'Error server-side');
      }

      const updated = await getActiveJunta();
      if (updated) onUpdate(updated);
      setShowPayModal(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      
      await enqueuePendingPayment(txPayload);
      setAlertDialog({
         isOpen: true,
         title: 'Error de Red - Guardado Local',
         message: 'El pago falló por red. Se guardó localmente y se reintentará luego.',
         type: 'info'
      });
      setTimeout(() => setAlertDialog(null), 3500);
      setShowPayModal(null);
      loadOfflineStats();
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };`
);

if (!d.includes('deletePending')) {
    d = d.replace(
        "import { enqueuePendingPayment } from '@/database/local';",
        "import { enqueuePendingPayment, getPendingPayments, deletePending } from '@/database/local';"
    );
}

const uiSnippet = `
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Agenda de la Junta</h2>
          
          <div className="flex gap-2 items-center">
             {(offlineStats.pending > 0 || offlineStats.failed > 0) && (
               <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                 {offlineStats.pending > 0 && <span className="text-amber-600">⏳ {offlineStats.pending} Pendientes</span>}
                 {offlineStats.failed > 0 && <span className="text-red-500">❌ {offlineStats.failed} Fallidos</span>}
                 <button onClick={handleRetrySync} className="text-indigo-600 hover:underline ml-2">Reintentar</button>
                 {offlineStats.failed > 0 && <button onClick={handleDiscardFailed} className="text-slate-500 hover:underline ml-2 text-xs">Descartar</button>}
               </div>
             )}
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
              <History className="w-4 h-4 mr-2" /> Historial Global
            </Button>
          </div>
        </div>
`;

d = d.replace(
    /<div className="flex items-center justify-between">\s*<h2 className="text-xl font-bold text-slate-800">Agenda de la Junta<\/h2>\s*<Button variant="ghost" size="sm" onClick=\{\(\) => setShowHistory\(true\)\}>\s*<History className="w-4 h-4 mr-2" \/> Historial Global\s*<\/Button>\s*<\/div>/,
    uiSnippet
);

fs.writeFileSync(p, d);
console.log("Replaced handleAddTransaction");
