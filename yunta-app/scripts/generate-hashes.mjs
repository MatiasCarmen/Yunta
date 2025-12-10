// Script simple para generar hashes de PINs
// Ejecutar con: node scripts/generate-hashes.mjs

import bcrypt from 'bcryptjs';

const pins = [
    { user: 'Matías', pin: '1234' },
    { user: 'Tomás', pin: '2345' },
    { user: 'Pilar', pin: '3456' },
    { user: 'Ariana', pin: '4567' },
    { user: 'Sthefany', pin: '5678' },
];

async function generateHashes() {
    console.log('Generando hashes de PINs...\n');

    for (const { user, pin } of pins) {
        const hash = await bcrypt.hash(pin, 10);
        console.log(`${user} (PIN: ${pin})`);
        console.log(`Hash: ${hash}\n`);
    }
}

generateHashes();
