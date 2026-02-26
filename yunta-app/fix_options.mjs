import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

if (!d.includes('CuentaDestino')) {
    d = d.replace(
        "import { PaymentMethod, PaymentDestination, TransactionInput, getActiveJunta, recordPayment, closeDay } from '@/app/actions/junta';",
        "import { PaymentMethod, PaymentDestination, TransactionInput, getActiveJunta, recordPayment, closeDay } from '@/app/actions/junta';\nimport { CuentaDestino } from '@prisma/client';"
    );
}

d = d.replace(
    `const [destination, setDestination] = useState<PaymentDestination>('EFECTIVO');`,
    `const [destination, setDestination] = useState<CuentaDestino | null>(CuentaDestino.EFECTIVO);`
);

// We should also replace the destination change handler
d = d.replace(
    `<Select value={destination} onChange={e => setDestination(e.target.value as typeof destination)} disabled={isSubmitting}>`,
    `<Select value={destination || ''} onChange={e => setDestination(e.target.value as CuentaDestino)} disabled={isSubmitting}>`
);

d = d.replace(`<option value="EFECTIVO">Efectivo / Caja chica</option>`, `<option value={CuentaDestino.EFECTIVO}>Efectivo / Caja chica</option>`);
d = d.replace(`<option value="YAPE_PILAR">Yape Pilar</option>`, `<option value={CuentaDestino.YAPE_PILAR}>Yape Pilar</option>`);
d = d.replace(`<option value="YAPE_SEBASTIAN">Yape Sebastian</option>`, `<option value={CuentaDestino.YAPE_SEBASTIAN}>Yape Sebastian</option>`);
d = d.replace(`<option value="YAPE_STHEFANY">Yape Sthefany</option>`, `<option value={CuentaDestino.YAPE_STHEFANY}>Yape Sthefany</option>`);
d = d.replace(`<option value="TRANSFERENCIA_SEBASTIAN">Transferencia Sebastian</option>`, `<option value={CuentaDestino.TRANSFERENCIA_SEBASTIAN}>Transferencia Sebastian</option>`);
d = d.replace(`<option value="TRANSFERENCIA_STHEFANY">Transferencia Sthefany</option>`, `<option value={CuentaDestino.TRANSFERENCIA_STHEFANY}>Transferencia Sthefany</option>`);

fs.writeFileSync(p, d);
console.log('Replaced destination variables in page.tsx');
