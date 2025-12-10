// Script para probar la API de autenticación
// Ejecutar con: node scripts/test-auth-api.mjs
// IMPORTANTE: El servidor Next.js debe estar corriendo (npm run dev)

const BASE_URL = 'http://localhost:3000';

async function testGetUsers() {
    console.log('\n=== TEST 1: GET /api/auth/users ===');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/users`);
        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        return data.users?.[0]?.id; // Retornar el ID del primer usuario
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

async function testLogin(userId, pin, description) {
    console.log(`\n=== TEST: ${description} ===`);

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, pin }),
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTests() {
    console.log('🧪 Iniciando pruebas de API de autenticación...');
    console.log('Asegúrate de que el servidor Next.js esté corriendo (npm run dev)\n');

    // Esperar un poco para asegurar que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Obtener usuarios
    const userId = await testGetUsers();

    if (!userId) {
        console.log('\n❌ No se pudo obtener usuarios. Asegúrate de:');
        console.log('1. El servidor Next.js está corriendo');
        console.log('2. Has creado los usuarios en Prisma Studio');
        return;
    }

    console.log(`\n✅ Usuario obtenido: ${userId}`);
    console.log('\nAhora vamos a probar el login con este usuario...');

    // Test 2: Login con PIN incorrecto (1er intento)
    await testLogin(userId, '0000', 'Login con PIN incorrecto (1/3)');

    // Test 3: Login con PIN incorrecto (2do intento)
    await testLogin(userId, '1111', 'Login con PIN incorrecto (2/3)');

    // Test 4: Login con PIN incorrecto (3er intento - debería bloquear)
    await testLogin(userId, '2222', 'Login con PIN incorrecto (3/3 - Bloqueo)');

    // Test 5: Intentar login estando bloqueado
    await testLogin(userId, '1234', 'Login estando bloqueado (debería rechazar)');

    console.log('\n✅ Pruebas completadas!');
    console.log('\n📝 Notas:');
    console.log('- El usuario está bloqueado por 5 minutos');
    console.log('- Puedes desbloquear manualmente en Prisma Studio:');
    console.log('  1. Abre el usuario');
    console.log('  2. Cambia failedLoginAttempts a 0');
    console.log('  3. Borra lastLockedAt');
    console.log('  4. Guarda los cambios');
    console.log('\n- O espera 5 minutos y prueba login con PIN correcto: 1234');
}

runTests();
