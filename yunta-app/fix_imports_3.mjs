import fs from 'fs';

const p = 'src/app/dashboard/junta/page.tsx';
let d = fs.readFileSync(p, 'utf8');

// remove all use clients
d = d.replace(/'use client';\r?\n/g, "");
d = d.replace(/"use client";\r?\n/g, "");
d = d.replace(/'use client'\r?\n/g, "");

// append exactly one
d = "'use client';\n" + d.trim();
fs.writeFileSync(p, d);
console.log("Fixed use client completely");
