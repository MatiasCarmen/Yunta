import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

if (!d.includes('useJuntaSync')) {
    d = "import { useJuntaSync } from '@/hooks/useJuntaSync';\n" + d;
}

if (!d.includes('enqueuePendingPayment')) {
    d = "import { enqueuePendingPayment } from '@/database/local';\n" + d;
}

fs.writeFileSync(p, d);
