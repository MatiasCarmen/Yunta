import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

if (d.includes("'use client';")) {
    d = d.replace(/'use client';\n/g, "");
    d = d.replace(/"use client";\n/g, "");
}

d = "'use client';\n" + d;
fs.writeFileSync(p, d);
console.log("Fixed use client");
