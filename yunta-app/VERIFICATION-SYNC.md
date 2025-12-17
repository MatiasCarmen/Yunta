# ✅ Guía de Verificación: Offline-First Meetings & Sync

Esta guía valida el flujo completo Offline-First del Módulo de Juntas, incluyendo creación local (Dexie) y sincronización con la nube (Supabase).

---

## 📋 Prerequisitos

- ✅ Aplicación ejecutándose (`npm run dev`)
- ✅ Usuarios sembrados en Supabase
- ✅ Sesión activa (logged in como usuario, ej: Matías)

---

## 🧪 Pasos de Verificación

### 1️⃣ Crear Junta en Modo Offline

**Navegación:** http://localhost:3000/dashboard/meetings/create

**Simular Offline:**

- **Opción A:** Desconectar WiFi
- **Opción B:** Chrome DevTools → Network → Offline

**Completar el formulario:**

| Campo                  | Valor                                   |
| ---------------------- | --------------------------------------- |
| **Título**             | `Sync Test Meeting`                     |
| **Fecha**              | Fecha de hoy                            |
| **Minuta / Contenido** | `Meeting created offline to test sync.` |
| **Acuerdos**           | `Verify sync functionality`             |

**Acción:** Haz clic en **"Guardar Acta"**

**✅ Criterio de Éxito:**

- Debe aparecer alerta: `✅ Junta guardada en el dispositivo (Modo Offline activo)`
- Redirige a `/dashboard`

---

### 2️⃣ Verificar Estado Local

**Navegación:** http://localhost:3000/dashboard/meetings

**✅ Criterios de Éxito:**

1. **Junta visible en la lista:**

   - Título: "Sync Test Meeting"
   - Fecha de hoy

2. **Badge de estado AMBER:**

   - Badge: `Pendiente Local` (color amarillo/ámbar)

3. **Mensaje de advertencia:**

   - Aparece: `💾 Solo en este dispositivo`

4. **Contador en el header:**

   - Debe mostrar: `1 Pendiente(s) de subida`

5. **Botón de sincronización habilitado:**
   - Aparece: `☁️ Subir Pendientes (1)`
   - Estado: Habilitado (no disabled)

---

### 3️⃣ Sincronizar (El Momento Mágico ✨)

**Volver Online:**

- **Opción A:** Reconectar WiFi
- **Opción B:** Chrome DevTools → Network → No throttling

**Acción:** Haz clic en **"☁️ Subir Pendientes"**

**✅ Criterios de Éxito:**

1. **Alerta de éxito:**

   - `✅ Sincronizadas 1 juntas`

2. **Badge cambia a VERDE:**

   - Antes: `Pendiente Local` (ámbar)
   - Después: `Sincronizado` (verde)

3. **Mensaje de advertencia desaparece:**

   - Ya NO muestra: `💾 Solo en este dispositivo`

4. **Contador se actualiza:**

   - Cambia de: `1 Pendiente(s) de subida`
   - A: `Todo sincronizado` (texto verde)

5. **Botón de sincronización se deshabilita:**
   - Aparece: `☁️ Subir Pendientes (0)`
   - Estado: Deshabilitado (disabled, opacity reducida)

---

### 4️⃣ Verificar Persistencia en la Nube

**Abrir Prisma Studio:**

```bash
cd yunta-app
npx prisma studio
```

**Navegación:** http://localhost:5555

**Pasos:**

1. Haz clic en el modelo **Meeting**
2. Busca el registro con título: `Sync Test Meeting`

**✅ Criterios de Éxito:**

El registro debe existir con:

```javascript
{
  id: "uuid-generado",
  title: "Sync Test Meeting",
  date: Date (hoy),
  minutes: "Meeting created offline to test sync.",
  notes: "Verify sync functionality",
  status: "COMPLETED",
  createdById: "uuid-del-usuario-Matias",
  createdAt: Date,
  updatedAt: Date
}
```

**Campos Clave:**

- ✅ `status: "COMPLETED"`
- ✅ `createdById` debe coincidir con el ID del usuario en sesión
- ✅ `minutes` contiene el contenido de la junta
- ✅ `notes` contiene los acuerdos

---

## 🔍 Troubleshooting

### ❌ No aparece el botón "Subir Pendientes"

**Causa:** No hay juntas pendientes o no hay conexión

**Solución:**

1. Verifica IndexedDB → YuntaLocalDB → meetings
2. Confirma que hay registros con `synced: 0`
3. Verifica que el navegador esté online

### ❌ Error al sincronizar: "No se encontró sesión de usuario"

**Causa:** No hay `userId` en localStorage

**Solución:**

1. Inicia sesión correctamente en `/api/auth/login`
2. Verifica en DevTools → Application → Local Storage:
   - Debe existir: `yunta_userId`
   - Debe existir: `yunta_userName`

### ❌ La sincronización falla con error 500

**Causa:** Error en el servidor (Prisma/Supabase)

**Solución:**

1. Verifica la consola del servidor (`npm run dev`)
2. Revisa que Supabase esté configurado correctamente
3. Verifica las credenciales en `.env`:
   ```
   DATABASE_URL="postgresql://..."
   ```

### ❌ El badge sigue en "Pendiente Local" después de sincronizar

**Causa:** El campo `synced` no se actualizó en Dexie

**Solución:**

1. Abre DevTools → Console
2. Ejecuta manualmente:
   ```javascript
   await (await import("/src/database/local.ts")).localDb.meetings
     .where("synced")
     .equals(0)
     .modify({ synced: 1 });
   ```
3. Recarga la página

### ❌ No aparece en Prisma Studio

**Causa:** El registro no se guardó en la base de datos

**Solución:**

1. Verifica los logs del servidor
2. Revisa que el endpoint `/api/meetings/sync` funcione:
   ```bash
   curl -X POST http://localhost:3000/api/meetings/sync \
     -H "Content-Type: application/json" \
     -d '{"userId":"uuid","meetings":[]}'
   ```
3. Verifica que la migración de Prisma esté aplicada:
   ```bash
   npx prisma migrate dev
   ```

---

## 🎯 Flujo Completo de Datos

```
┌─────────────────────┐
│ 1. Crear Offline    │
│ MeetingEditor.tsx   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. Guardar Local    │
│ Dexie (IndexedDB)   │
│ synced: 0           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. Mostrar Lista    │
│ /dashboard/meetings │
│ Badge: Pendiente    │
└──────────┬──────────┘
           │
           ▼ (Click "Subir Pendientes")
┌─────────────────────┐
│ 4. Sincronizar      │
│ syncMeetings()      │
│ → /api/meetings/sync│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Guardar Nube     │
│ Prisma → Supabase   │
│ Meeting created     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Actualizar Dexie │
│ synced: 0 → 1       │
│ Badge: Sincronizado │
└─────────────────────┘
```

---

## 📊 Verificación de Base de Datos Local

### IndexedDB (Chrome DevTools)

1. F12 → Application → IndexedDB → YuntaLocalDB → meetings
2. Busca el registro de "Sync Test Meeting"

**Antes de sincronizar:**

```javascript
{
  id: 1,
  title: "Sync Test Meeting",
  date: Date,
  content: "Meeting created offline to test sync.",
  agreements: "Verify sync functionality",
  participants: [],
  synced: 0  // ← PENDIENTE
}
```

**Después de sincronizar:**

```javascript
{
  id: 1,
  title: "Sync Test Meeting",
  date: Date,
  content: "Meeting created offline to test sync.",
  agreements: "Verify sync functionality",
  participants: [],
  synced: 1  // ← SINCRONIZADO
}
```

---

## ✅ Checklist de Verificación Final

### Fase 1: Creación Offline

- [ ] Página `/dashboard/meetings/create` carga correctamente
- [ ] Modo offline activado (WiFi desconectado o DevTools)
- [ ] Formulario completo con datos de prueba
- [ ] Botón "Guardar Acta" funciona sin internet
- [ ] Alerta de éxito aparece
- [ ] Redirige a `/dashboard`

### Fase 2: Verificación Local

- [ ] `/dashboard/meetings` muestra la junta creada
- [ ] Badge "Pendiente Local" visible (color ámbar)
- [ ] Mensaje "Solo en este dispositivo" presente
- [ ] Contador muestra "1 Pendiente(s) de subida"
- [ ] Botón "Subir Pendientes" habilitado

### Fase 3: Sincronización

- [ ] Modo online activado (WiFi reconectado)
- [ ] Botón "Subir Pendientes" clickeable
- [ ] Alerta "✅ Sincronizadas 1 juntas" aparece
- [ ] Badge cambia a "Sincronizado" (verde)
- [ ] Mensaje "Solo en este dispositivo" desaparece
- [ ] Contador cambia a "Todo sincronizado"

### Fase 4: Persistencia en Nube

- [ ] Prisma Studio ejecutándose (`npx prisma studio`)
- [ ] Tabla `Meeting` contiene el registro
- [ ] Campo `title` correcto
- [ ] Campo `status` = "COMPLETED"
- [ ] Campo `createdById` apunta al usuario correcto
- [ ] Campos `minutes` y `notes` tienen el contenido

---

## 🎉 ¡Verificación Exitosa!

Si todos los checks anteriores pasan, tu implementación Offline-First está funcionando correctamente:

✅ **Creación sin conexión**
✅ **Almacenamiento local persistente**
✅ **Sincronización automática**
✅ **Persistencia en la nube**
✅ **Indicadores visuales claros**

---

## 🚀 Próximos Pasos

Una vez verificado el flujo básico:

1. **Auto-sync al detectar conexión** (EventListener 'online')
2. **Manejo de conflictos** (si se edita en múltiples dispositivos)
3. **Retry automático** en caso de fallo de sincronización
4. **Background sync** (Service Workers)
5. **Vista de detalles** de cada junta
6. **Edición de juntas** ya sincronizadas
