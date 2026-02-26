import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

// Add import for enqueuePendingPayment if not exists
if (!d.includes('enqueuePendingPayment')) {
    d = d.replace(
        "import { recordPayment, closeDay, rescheduleTurn, getActiveJunta, createJunta } from '@/app/actions/junta';",
        "import { recordPayment, closeDay, rescheduleTurn, getActiveJunta, createJunta } from '@/app/actions/junta';\nimport { enqueuePendingPayment } from '@/database/local';\nimport { useJuntaSync } from '@/hooks/useJuntaSync';"
    );
}

// Update Dashboard component to use hook
if (!d.includes('useJuntaSync(junta.id')) {
    d = d.replace(
        `function Dashboard({ junta, onUpdate, onViewDetail }: { junta: JuntaState; onUpdate: (j: JuntaState) => void; onViewDetail: (id: string) => void }) {`,
        `function Dashboard({ junta, onUpdate, onViewDetail }: { junta: JuntaState; onUpdate: (j: JuntaState) => void; onViewDetail: (id: string) => void }) {
  // Offline sync hook
  useJuntaSync(junta.id, async () => {
    const updated = await getActiveJunta();
    if (updated) onUpdate(updated);
  });
`
    );
}

// Replace handleAddTransaction
const oldHandler = `  const handleAddTransaction = async (txData: TransactionInput) => {
    try {
      await recordPayment(junta.id, txData);
      // Reload junta state
      const updated = await getActiveJunta();
      if (updated) onUpdate(updated);
      setShowPayModal(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error al registrar el pago');
    }
  };`;

const newHandler = `  const handleAddTransaction = async (txData: TransactionInput) => {
    // Generate UUID manually since crypto might need a fallback, but randomUUID is mostly safe in recent browsers
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
       return;
    }

    try {
      setLoadingState({ isLoading: true, message: 'Procesando pago...' });
      const res = await recordPayment(junta.id, txPayload);
      
      if (!res.success) {
         throw new Error(res.error || 'Error server-side');
      }

      // Reload junta state
      const updated = await getActiveJunta();
      if (updated) onUpdate(updated);
      setShowPayModal(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      
      // Failsafe for mid-flight disconnect
      await enqueuePendingPayment(txPayload);
      setAlertDialog({
         isOpen: true,
         title: 'Error de Red - Guardado Local',
         message: 'El pago falló por red. Se guardó localmente y se reintentará luego.',
         type: 'info'
      });
      setTimeout(() => setAlertDialog(null), 3500);
      setShowPayModal(null);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };`;

d = d.replace(oldHandler, newHandler);
fs.writeFileSync(p, d);
console.log("Updated page.tsx successfully");
