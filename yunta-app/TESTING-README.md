# 🧪 Testing Guide: Offline-First Meetings Sync

Esta carpeta contiene guías y scripts para verificar el módulo de Juntas Offline-First.

## 📋 Archivos de Verificación

### 1. `VERIFICATION-OFFLINE-MEETINGS.md`

Guía básica para verificar la **creación offline** de juntas.

**Qué verifica:**

- ✅ Guardado local en Dexie (IndexedDB)
- ✅ Banner "Offline-First"
- ✅ Funcionamiento sin internet

**Cuándo usarlo:** Primera vez configurando el módulo.

---

### 2. `VERIFICATION-SYNC.md` ⭐

Guía completa para verificar el **flujo completo de sincronización**.

**Qué verifica:**

- ✅ Creación offline de juntas
- ✅ Almacenamiento local
- ✅ Listado con badges de estado
- ✅ Sincronización con Supabase
- ✅ Persistencia en la nube

**Cuándo usarlo:** Para verificar el flujo end-to-end completo.

---

## 🛠️ Scripts de Prueba

### 1. `scripts/test-dexie.js`

Script para probar la base de datos local (Dexie).

**Uso:**

```javascript
// En la consola del navegador:
await testDexieConnection();
await createTestMeeting();
await listAllMeetings();
```

### 2. `scripts/test-sync-flow.js` ⭐

Script automatizado para probar el flujo completo.

**Uso:**

```javascript
// En la consola del navegador:
await syncTest.runFullSyncTest();
```

**Pasos que ejecuta:**

1. ✅ Verifica configuración
2. ✅ Crea junta de prueba
3. ✅ Verifica estado local
4. ✅ Sincroniza con servidor
5. ✅ Verifica resultado

---

## 🚀 Quick Start

### Opción 1: Verificación Manual (Recomendado para primera vez)

1. Asegúrate de que el servidor esté corriendo:

   ```bash
   npm run dev
   ```

2. Abre: `VERIFICATION-SYNC.md`

3. Sigue los pasos uno por uno

4. Verifica cada criterio de éxito

---

### Opción 2: Verificación Automatizada (Para pruebas rápidas)

1. Servidor corriendo:

   ```bash
   npm run dev
   ```

2. Abre http://localhost:3000/dashboard/meetings

3. Abre la consola del navegador (F12)

4. Copia y pega el contenido de `scripts/test-sync-flow.js`

5. Ejecuta:

   ```javascript
   await syncTest.runFullSyncTest();
   ```

6. Observa los resultados en la consola

---

## 📊 Flujo de Verificación Recomendado

```
1️⃣ Primera Configuración
   └─ VERIFICATION-OFFLINE-MEETINGS.md
   └─ Objetivo: Verificar que Dexie funcione

2️⃣ Flujo Completo
   └─ VERIFICATION-SYNC.md
   └─ Objetivo: Verificar sincronización end-to-end

3️⃣ Pruebas Automatizadas
   └─ scripts/test-sync-flow.js
   └─ Objetivo: Pruebas rápidas y repetidas
```

---

## ✅ Checklist de Pre-requisitos

Antes de comenzar cualquier verificación, asegúrate de:

- [ ] Node.js instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Variables de entorno configuradas (`.env`)
- [ ] Base de datos Supabase configurada
- [ ] Usuarios sembrados en Supabase
- [ ] Servidor ejecutándose (`npm run dev`)
- [ ] Sesión iniciada en la aplicación

---

## 🔧 Comandos Útiles

### Iniciar servidor de desarrollo

```bash
npm run dev
```

### Abrir Prisma Studio (para verificar DB)

```bash
npx prisma studio
```

### Ver logs de la base de datos local

```javascript
// En consola del navegador:
indexedDB.databases().then(console.log);
```

### Limpiar base de datos local

```javascript
// En consola del navegador:
await (await import("/src/database/local.ts")).localDb.meetings.clear();
```

---

## 📞 Troubleshooting

### Problema: "No hay sesión activa"

**Solución:**

1. Inicia sesión en `/api/auth/login`
2. Verifica localStorage:
   - `yunta_userId` debe existir
   - `yunta_userName` debe existir

### Problema: "Error sincronizando: 500"

**Solución:**

1. Revisa la consola del servidor
2. Verifica que Supabase esté online
3. Confirma que `.env` tenga `DATABASE_URL`

### Problema: "YuntaLocalDB no aparece en IndexedDB"

**Solución:**

1. Recarga la página (F5)
2. Verifica que estés en `http://localhost:3000`
3. Revisa errores en la consola

---

## 📚 Documentación Adicional

- **API Documentation:** Ver `API-TRANSACTIONS.md` y `API-AUTH.md`
- **Schema Prisma:** Ver `src/database/schema.prisma`
- **Tipos TypeScript:** Ver `src/types/meeting.ts`

---

## 🎯 Objetivos de Testing

Al completar todas las verificaciones, debes haber validado:

✅ **Offline-First:** Aplicación funciona sin internet
✅ **Local Storage:** Datos se guardan en Dexie
✅ **Sincronización:** Datos se suben a Supabase al volver online
✅ **Indicadores Visuales:** Badges y mensajes claros
✅ **Persistencia:** Datos persisten en la nube

---

**¿Necesitas ayuda?** Revisa las guías o contacta al equipo de desarrollo.
