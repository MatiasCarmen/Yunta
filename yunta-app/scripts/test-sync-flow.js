// ============================================
// YUNTA - Script de Prueba: Sync Flow
// ============================================
// Ejecuta este script en la consola del navegador
// para probar el flujo completo de sincronización
// ============================================

console.log('🧪 YUNTA - Test de Sincronización Offline-First');
console.log('================================================\n');

// ============================================
// PASO 1: Verificar Configuración
// ============================================

async function step1_verifySetup() {
    console.log('📋 PASO 1: Verificando configuración...\n');

    // Verificar Dexie
    try {
        const { localDb } = await import('/src/database/local.ts');
        console.log('✅ Dexie cargado correctamente');
        console.log('   Base de datos:', localDb.name);
    } catch (error) {
        console.error('❌ Error cargando Dexie:', error);
        return false;
    }

    // Verificar sesión
    const userId = localStorage.getItem('yunta_userId');
    const userName = localStorage.getItem('yunta_userName');

    if (userId && userName) {
        console.log('✅ Sesión activa encontrada');
        console.log('   Usuario:', userName);
        console.log('   ID:', userId);
    } else {
        console.error('❌ No hay sesión activa');
        console.log('   Por favor inicia sesión primero');
        return false;
    }

    // Verificar conexión
    const online = navigator.onLine;
    console.log(online ? '✅ Navegador online' : '⚠️ Navegador offline');

    console.log('\n');
    return true;
}

// ============================================
// PASO 2: Crear Junta de Prueba
// ============================================

async function step2_createTestMeeting() {
    console.log('📝 PASO 2: Creando junta de prueba...\n');

    try {
        const { localDb } = await import('/src/database/local.ts');

        const testMeeting = {
            title: `Test Sync ${new Date().toLocaleTimeString()}`,
            date: new Date(),
            content: 'Esta junta fue creada desde la consola del navegador para probar el flujo de sincronización.',
            agreements: 'Verificar que el sync funcione correctamente.',
            participants: [],
            synced: 0, // Pendiente
        };

        const id = await localDb.meetings.add(testMeeting);

        console.log('✅ Junta creada con ID:', id);
        console.log('   Título:', testMeeting.title);
        console.log('   Estado: Pendiente (synced: 0)');
        console.log('\n');

        return id;
    } catch (error) {
        console.error('❌ Error creando junta:', error);
        return null;
    }
}

// ============================================
// PASO 3: Verificar Estado Local
// ============================================

async function step3_verifyLocalState() {
    console.log('🔍 PASO 3: Verificando estado local...\n');

    try {
        const { localDb } = await import('/src/database/local.ts');

        const allMeetings = await localDb.meetings.toArray();
        const pendingMeetings = await localDb.meetings.where('synced').equals(0).toArray();

        console.log('📊 Total de juntas:', allMeetings.length);
        console.log('⏳ Juntas pendientes:', pendingMeetings.length);

        if (pendingMeetings.length > 0) {
            console.log('\n📋 Juntas pendientes de sincronizar:');
            console.table(
                pendingMeetings.map((m) => ({
                    ID: m.id,
                    Título: m.title,
                    Fecha: new Date(m.date).toLocaleDateString(),
                    Estado: m.synced === 0 ? '⏳ Pendiente' : '✅ Sincronizado',
                }))
            );
        }

        console.log('\n');
        return pendingMeetings.length;
    } catch (error) {
        console.error('❌ Error verificando estado:', error);
        return 0;
    }
}

// ============================================
// PASO 4: Sincronizar con el Servidor
// ============================================

async function step4_syncWithServer() {
    console.log('☁️ PASO 4: Sincronizando con el servidor...\n');

    const userId = localStorage.getItem('yunta_userId');

    if (!userId) {
        console.error('❌ No hay sesión activa');
        return false;
    }

    try {
        const { syncMeetings } = await import('/src/services/sync.ts');

        console.log('📤 Iniciando sincronización...');

        const result = await syncMeetings(userId);

        if (result.success) {
            console.log('✅ Sincronización exitosa!');
            console.log('   Juntas sincronizadas:', result.count);
            console.log('   Mensaje:', result.message);
        } else {
            console.error('❌ Error en sincronización');
            console.error('   Error:', result.error);
        }

        console.log('\n');
        return result.success;
    } catch (error) {
        console.error('❌ Error sincronizando:', error);
        return false;
    }
}

// ============================================
// PASO 5: Verificar Resultado
// ============================================

async function step5_verifyResult() {
    console.log('✅ PASO 5: Verificando resultado...\n');

    try {
        const { localDb } = await import('/src/database/local.ts');

        const allMeetings = await localDb.meetings.toArray();
        const syncedMeetings = await localDb.meetings.where('synced').equals(1).toArray();
        const pendingMeetings = await localDb.meetings.where('synced').equals(0).toArray();

        console.log('📊 Resultado final:');
        console.log('   Total de juntas:', allMeetings.length);
        console.log('   Sincronizadas:', syncedMeetings.length);
        console.log('   Pendientes:', pendingMeetings.length);

        if (allMeetings.length > 0) {
            console.log('\n📋 Todas las juntas:');
            console.table(
                allMeetings.map((m) => ({
                    ID: m.id,
                    Título: m.title.substring(0, 30),
                    Fecha: new Date(m.date).toLocaleDateString(),
                    Estado: m.synced === 0 ? '⏳ Pendiente' : '✅ Sincronizado',
                }))
            );
        }

        console.log('\n');

        // Instrucciones para verificar en Prisma
        if (syncedMeetings.length > 0) {
            console.log('🔬 Para verificar en Prisma Studio:');
            console.log('   1. Ejecuta: npx prisma studio');
            console.log('   2. Abre: http://localhost:5555');
            console.log('   3. Ve a la tabla: Meeting');
            console.log('   4. Busca las juntas recién sincronizadas\n');
        }

        return true;
    } catch (error) {
        console.error('❌ Error verificando resultado:', error);
        return false;
    }
}

// ============================================
// TEST COMPLETO
// ============================================

async function runFullSyncTest() {
    console.log('🚀 INICIANDO TEST COMPLETO DE SINCRONIZACIÓN\n');
    console.log('==============================================\n\n');

    const step1 = await step1_verifySetup();
    if (!step1) {
        console.log('❌ Test abortado: Configuración inválida\n');
        return;
    }

    const meetingId = await step2_createTestMeeting();
    if (!meetingId) {
        console.log('❌ Test abortado: No se pudo crear junta\n');
        return;
    }

    const pendingCount = await step3_verifyLocalState();

    if (!navigator.onLine) {
        console.log('⚠️ No hay conexión a internet');
        console.log('   Conecta WiFi y ejecuta: await step4_syncWithServer()\n');
        return;
    }

    const syncSuccess = await step4_syncWithServer();
    if (!syncSuccess) {
        console.log('❌ Test completado con errores\n');
        return;
    }

    await step5_verifyResult();

    console.log('✅ TEST COMPLETADO EXITOSAMENTE!\n');
    console.log('==============================================\n');
}

// ============================================
// COMANDOS DISPONIBLES
// ============================================

console.log(`
🧪 COMANDOS DISPONIBLES:

Ejecutar test completo:
  await runFullSyncTest()

Ejecutar pasos individuales:
  await step1_verifySetup()
  await step2_createTestMeeting()
  await step3_verifyLocalState()
  await step4_syncWithServer()
  await step5_verifyResult()

Utilidades:
  await showAllMeetings()
  await clearAllPendingMeetings()
  await resetAllMeetings()

💡 Recomendación: Ejecuta primero runFullSyncTest()
`);

// ============================================
// UTILIDADES ADICIONALES
// ============================================

async function showAllMeetings() {
    const { localDb } = await import('/src/database/local.ts');
    const meetings = await localDb.meetings.toArray();
    console.table(
        meetings.map((m) => ({
            ID: m.id,
            Título: m.title,
            Fecha: new Date(m.date).toLocaleDateString(),
            Estado: m.synced === 0 ? 'Pendiente' : 'Sincronizado',
        }))
    );
}

async function clearAllPendingMeetings() {
    const confirm = window.confirm('¿Eliminar TODAS las juntas pendientes?');
    if (!confirm) return;

    const { localDb } = await import('/src/database/local.ts');
    await localDb.meetings.where('synced').equals(0).delete();
    console.log('✅ Juntas pendientes eliminadas');
}

async function resetAllMeetings() {
    const confirm = window.confirm('⚠️ ¿Eliminar TODAS las juntas (pendientes y sincronizadas)?');
    if (!confirm) return;

    const { localDb } = await import('/src/database/local.ts');
    await localDb.meetings.clear();
    console.log('✅ Todas las juntas eliminadas');
}

// Exportar funciones globalmente
window.syncTest = {
    runFullSyncTest,
    step1_verifySetup,
    step2_createTestMeeting,
    step3_verifyLocalState,
    step4_syncWithServer,
    step5_verifyResult,
    showAllMeetings,
    clearAllPendingMeetings,
    resetAllMeetings,
};

console.log('\n✅ Script cargado. Ejecuta: await syncTest.runFullSyncTest()\n');
