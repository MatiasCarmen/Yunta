import fs from 'fs';

const p = 'src/app/actions/junta.ts';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(
    `import { Prisma, $Enums } from '@prisma/client';`,
    `import { Prisma, $Enums, CuentaDestino } from '@prisma/client';`
);

d = d.replace(
    `export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination: PaymentDestination;
    notes?: string;
    clientTxId?: string;
};`,
    `export type TransactionInput = {
    targetDate: string;
    participantId: string;
    amount: number;
    method: PaymentMethod;
    destination?: CuentaDestino | null;
    notes?: string;
    clientTxId?: string;
};`
);

fs.writeFileSync(p, d);
