# ✅ Guía de Verificación: Editor de Juntas Offline

Esta guía te ayuda a verificar que el módulo de "Juntas" funcione correctamente guardando datos en la base de datos local del navegador (Dexie/IndexedDB) cuando estás sin conexión.

---

## 📋 Prerequisitos

- ✅ Aplicación ejecutándose (`npm run dev`)
- ✅ Usuarios sembrados en Supabase (Paso Manual)
- ✅ Paquete `uuid` instalado (ya incluido en package.json)

---

## 🧪 Pasos de Verificación

### 1️⃣ Acceder a la Página de Creación

Navega a: **http://localhost:3000/dashboard/meetings/create**

**✅ Criterio de Éxito:**

- Debes ver el formulario "Nueva Junta Directiva"
- Debe aparecer un banner amarillo con el texto "Offline-First" y el ícono 🔌
- El banner debe decir: _"Modo Offline-First activo. Puedes redactar el acta sin internet..."_

---

### 2️⃣ Simular Modo Offline (Opcional pero Recomendado)

**Opción A: Usar Chrome DevTools**

1. Abre Chrome DevTools presionando **F12**
2. Ve a la pestaña **Network** (Red)
3. En el dropdown "No throttling", selecciona **Offline**

**Opción B: Desconectar WiFi**

- Simplemente desactiva tu WiFi

---

### 3️⃣ Crear una Junta de Prueba

Completa el formulario con los siguientes datos de prueba:

| Campo                      | Valor                                                 |
| -------------------------- | ----------------------------------------------------- |
| **Título**                 | `Junta de Prueba Offline`                             |
| **Fecha**                  | Selecciona la fecha de hoy                            |
| **Minuta / Contenido**     | `Esta es una minuta de prueba guardada sin internet.` |
| **Acuerdos y Compromisos** | `Revisar Dexie.`                                      |

Haz clic en **"Guardar Acta"**

**✅ Criterio de Éxito:**

- Debe aparecer una alerta: `✅ Junta guardada en el dispositivo (Modo Offline activo)`
- Serás redirigido a `/dashboard`

---

### 4️⃣ Verificar Almacenamiento Local (Dexie)

1. En DevTools, ve a la pestaña **Application** (Aplicación)
2. En el panel izquierdo, expande **Storage → IndexedDB**
3. Haz clic en **YuntaLocalDB**
4. Haz clic en la tabla **meetings**

**✅ Criterios de Éxito:**

Deberías ver una nueva fila con los siguientes datos:

```javascript
{
  id: 1,                                    // Auto-incremental
  title: "Junta de Prueba Offline",
  date: Date (2025-12-17...),              // Fecha de hoy
  content: "Esta es una minuta de prueba guardada sin internet.",
  agreements: "Revisar Dexie.",
  participants: [],                         // Vacío por ahora
  synced: 0                                // 0 = Pendiente de sincronizar
}
```

**Campo Clave:** `synced: 0` indica que está pendiente de subir a Supabase cuando recuperes la conexión.

---

## 🔍 Troubleshooting (Solución de Problemas)

### ❌ No veo YuntaLocalDB en IndexedDB

**Solución:**

1. Recarga la página (F5)
2. Asegúrate de estar en http://localhost:3000
3. Verifica la consola para errores de JavaScript

### ❌ El guardado falla

**Solución:**

1. Abre la **Console** en DevTools
2. Busca errores en rojo
3. Verifica que los campos requeridos estén completos (título y fecha)
4. Asegúrate de que `uuid` esté instalado:
   ```bash
   npm install uuid
   ```

### ❌ No aparece la alerta de éxito

**Solución:**

- Verifica la consola del navegador
- Asegúrate de que el código no tenga errores de TypeScript
- Revisa que `localDb` esté importado correctamente en MeetingEditor.tsx

### ❌ No se redirige al dashboard

**Solución:**

- Verifica que `/dashboard` exista en tu aplicación
- Revisa la consola por errores de navegación

---

## 🎯 Próximos Pasos (Después de la Verificación)

Una vez verificado que el guardado offline funciona:

1. **Implementar sincronización automática** cuando vuelva la conexión
2. **Agregar selector de participantes** para asignar usuarios a la junta
3. **Crear vista de listado de juntas** guardadas localmente
4. **Indicador visual** de juntas sincronizadas vs pendientes

---

## 📊 Estructura de Datos (Referencia)

### LocalMeeting Interface

```typescript
interface LocalMeeting {
  id?: number; // Auto-incremental (Dexie)
  title: string; // Título de la junta
  participants: string[]; // IDs de usuarios
  content: string; // Minuta completa
  agreements: string; // Acuerdos tomados
  date: Date; // Fecha de la junta
  synced: number; // 0 = Pendiente, 1 = Sincronizado
}
```

---

## ✅ Checklist Final

- [ ] Servidor corriendo en http://localhost:3000
- [ ] Página `/dashboard/meetings/create` carga correctamente
- [ ] Banner "Offline-First" visible
- [ ] Formulario acepta datos de prueba
- [ ] Botón "Guardar Acta" funciona (con o sin internet)
- [ ] Alerta de éxito aparece
- [ ] YuntaLocalDB visible en DevTools
- [ ] Tabla `meetings` contiene el registro guardado
- [ ] Campo `synced: 0` presente en el registro

---

**🎉 Si todos los checks pasan, tu módulo de Juntas Offline está funcionando correctamente!**
