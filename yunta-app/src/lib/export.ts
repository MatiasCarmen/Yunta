// Client-side CSV export utility

interface Transaction {
  id: string;
  amount: number | string;
  type: 'IN' | 'OUT';
  description: string;
  category?: string;
  date: string;
  method?: string;
  user?: { name: string };
}

export function exportTransactionsToCSV(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return;
  }

  // CSV headers
  const headers = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', 'Método', 'Usuario'];

  // CSV rows
  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
    t.category || 'Sin categoría',
    t.type === 'IN' ? 'Ingreso' : 'Gasto',
    typeof t.amount === 'number' ? t.amount.toFixed(2) : t.amount,
    t.method || 'N/A',
    t.user?.name || 'N/A',
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `yunta-transacciones-${timestamp}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportTransactionsToJSON(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return;
  }

  const jsonContent = JSON.stringify(transactions, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `yunta-transacciones-${timestamp}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
