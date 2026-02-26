import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

if (!d.includes("import { useJuntaSync }")) {
    d = d.replace(/'use client';/g, "'use client';\nimport { useJuntaSync } from '@/hooks/useJuntaSync';\n");
}

fs.writeFileSync(p, d);
console.log("Injected useJuntaSync import");
