// ============================================
// SCRIPT DE PRUEBA - Dexie YuntaLocalDB
// ============================================
// Copia y pega este código en la consola del navegador
// para verificar que Dexie esté funcionando correctamente
// ============================================

// 1. Verificar que YuntaLocalDB existe
async function testDexieConnection() {
    console.log('🔍 Verificando conexión a Dexie...');
    
    try {
        // Importar dinámicamente la base de datos
        const { localDb } = await import('/src/database/local.ts');
        
        console.log('✅ YuntaLocalDB encontrada:', localDb);
        console.log('📊 Tablas disponibles:', localDb.tables.map(t => t.name));
        
        return localDb;
    } catch (error) {
        console.error('❌ Error conectando a Dexie:', error);
        return null;
    }
}

// 2. Crear una junta de prueba
async function createTestMeeting() {
    console.log('📝 Creando junta de prueba...');
    
    try {
        const { localDb } = await import('/src/database/local.ts');
        
        const testMeeting = {
            title: 'Junta de Prueba desde Consola',
            date: new Date(),
            content: 'Esta es una minuta creada desde la consola del navegador para probar Dexie.',
            agreements: 'Verificar que IndexedDB funcione correctamente.',
            participants: [],
            synced: 0
        };
        
        const id = await localDb.meetings.add(testMeeting);
        
        console.log('✅ Junta creada con ID:', id);
        console.log('📄 Datos guardados:', testMeeting);
        
        return id;
    } catch (error) {
        console.error('❌ Error creando junta:', error);
        return null;
    }
}

// 3. Listar todas las juntas guardadas
async function listAllMeetings() {
    console.log('📋 Listando todas las juntas...');
    
    try {
        const { localDb } = await import('/src/database/local.ts');
        
        const meetings = await localDb.meetings.toArray();
        
        console.log(`✅ Total de juntas: ${meetings.length}`);
        console.table(meetings);
        
        return meetings;
    } catch (error) {
        console.error('❌ Error listando juntas:', error);
        return [];
    }
}

// 4. Verificar juntas pendientes de sincronizar
async function checkPendingSync() {
    console.log('⏳ Verificando juntas pendientes de sincronización...');
    
    try {
        const { localDb } = await import('/src/database/local.ts');
        
        const pending = await localDb.meetings
            .where('synced')
            .equals(0)
            .toArray();
        
        console.log(`✅ Juntas pendientes: ${pending.length}`);
        console.table(pending);
        
        return pending;
    } catch (error) {
        console.error('❌ Error verificando pendientes:', error);
        return [];
    }
}

// 5. Limpiar todas las juntas (usar con cuidado)
async function clearAllMeetings() {
    const confirm = window.confirm('⚠️ ¿Estás seguro de que quieres eliminar TODAS las juntas locales?');
    
    if (!confirm) {
        console.log('❌ Operación cancelada');
        return;
    }
    
    try {
        const { localDb } = await import('/src/database/local.ts');
        
        await localDb.meetings.clear();
        
        console.log('✅ Todas las juntas han sido eliminadas');
    } catch (error) {
        console.error('❌ Error limpiando juntas:', error);
    }
}

// 6. Verificar estructura completa de IndexedDB
async function inspectDatabase() {
    console.log('🔬 Inspeccionando estructura de la base de datos...');
    
    try {
        const { localDb } = await import('/src/database/local.ts');
        
        console.log('📊 Nombre:', localDb.name);
        console.log('📊 Versión:', localDb.verno);
        console.log('📊 Tablas:', localDb.tables.map(t => ({
            name: t.name,
            schema: t.schema
        })));
        
        // Contar registros en cada tabla
        for (const table of localDb.tables) {
            const count = await table.count();
            console.log(`📊 ${table.name}: ${count} registros`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error inspeccionando base de datos:', error);
        return false;
    }
}

// ============================================
// COMANDOS RÁPIDOS
// ============================================

console.log(`
🧪 COMANDOS DE PRUEBA DISPONIBLES:

1. testDexieConnection()     - Verificar conexión a Dexie
2. createTestMeeting()        - Crear una junta de prueba
3. listAllMeetings()          - Listar todas las juntas
4. checkPendingSync()         - Ver juntas pendientes de sincronizar
5. clearAllMeetings()         - Limpiar todas las juntas (⚠️ cuidado)
6. inspectDatabase()          - Inspeccionar estructura completa

💡 Ejemplo de uso:
   await testDexieConnection();
   await createTestMeeting();
   await listAllMeetings();
`);

// ============================================
// TEST AUTOMÁTICO COMPLETO
// ============================================

async function runFullTest() {
    console.log('🚀 Ejecutando suite completa de pruebas...\n');
    
    await testDexieConnection();
    console.log('\n');
    
    await inspectDatabase();
    console.log('\n');
    
    const id = await createTestMeeting();
    console.log('\n');
    
    await listAllMeetings();
    console.log('\n');
    
    await checkPendingSync();
    console.log('\n');
    
    console.log('✅ Suite de pruebas completada!');
}

// Exportar para uso en consola
window.dexieTest = {
    testDexieConnection,
    createTestMeeting,
    listAllMeetings,
    checkPendingSync,
    clearAllMeetings,
    inspectDatabase,
    runFullTest
};

console.log('✅ Script de prueba cargado. Usa window.dexieTest.runFullTest() para ejecutar todas las pruebas.');
