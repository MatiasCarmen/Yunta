# 💰 Sistema de Gestión de Caja - Yunta App

## 📋 Descripción General

El sistema de gestión de caja permite controlar y administrar todos los fondos de la junta a través de **6 cuentas diferentes**:

### Cuentas Disponibles:

1. **📱 Yape Sebastian** - Cuenta Yape personal de Sebastian
2. **📱 Yape Pilar** - Cuenta Yape personal de Pilar
3. **📱 Yape Sthefany** - Cuenta Yape personal de Sthefany
4. **🏦 Transferencia Sebastian** - Cuenta bancaria de Sebastian
5. **🏦 Transferencia Sthefany** - Cuenta bancaria de Sthefany
6. **💵 Efectivo** - Dinero en efectivo / Caja chica

---

## 🚀 Acceso al Sistema

1. Ingresar al **Dashboard de Junta** (`/dashboard/junta`)
2. Hacer clic en el botón verde **"💰 Caja"** ubicado en el header
3. Se abrirá la vista de gestión de caja

---

## 📊 Funcionalidades Principales

### 1️⃣ **Estado Actual**

Muestra un resumen completo de todas las cuentas:

- **Card de Resumen Total**: Muestra el total consolidado en todas las cuentas
- **Tarjetas por Cuenta**:
  - Saldo actual de cada cuenta
  - Icono identificador (📱 🏦 💵)
  - Alerta visual si saldo < umbral (S/ 100)
  - Notas asociadas a la cuenta

#### 🔔 Alertas de Saldo Bajo

- Se muestra un banner amarillo en la parte superior cuando alguna cuenta tiene saldo menor al umbral de alerta
- Lista todas las cuentas con saldo bajo
- Facilita la toma de decisiones para consolidación de fondos

---

### 2️⃣ **Transferir entre Cuentas**

**Botón:** "↔️ Transferir"

Permite mover dinero de una cuenta a otra.

#### Campos:

- **Cuenta Origen\*** (obligatorio): Seleccionar de dónde se saca el dinero
- **Cuenta Destino\*** (obligatorio): Seleccionar a dónde se envía
- **Monto (S/)\*** (obligatorio): Cantidad a transferir
- **Descripción\*** (obligatorio): Motivo de la transferencia
- **Notas** (opcional): Información adicional

#### Validaciones:

- ✅ Verifica que haya saldo suficiente en cuenta origen
- ✅ No permite transferir a la misma cuenta
- ✅ Actualiza ambas cuentas en una transacción atómica
- ✅ Registra el movimiento en el historial

#### Ejemplos de Uso:

- Consolidar fondos de Yape a cuenta bancaria
- Distribuir dinero del efectivo a cuentas digitales
- Preparar fondos para pago a beneficiarios

---

### 3️⃣ **Registrar Gasto**

**Botón:** "📉 Registrar Gasto"

Registra salidas de dinero (pagos a beneficiarios, gastos operativos, etc.)

#### Campos:

- **Cuenta a Descontar\*** (obligatorio): De qué cuenta sale el dinero
- **Monto (S/)\*** (obligatorio): Cantidad del gasto
- **Descripción\*** (obligatorio): Detalle del gasto
- **Beneficiario** (opcional): Persona que recibe el dinero
- **Categoría** (opcional): Tipo de gasto
  - Comida
  - Transporte
  - Compras
  - Encargos
  - Mercadería
  - Salud
  - Educación
  - Entretenimiento
  - Servicios
  - Pago a personal
  - Otros
- **Notas** (opcional): Información adicional

#### Validaciones:

- ✅ Verifica saldo suficiente
- ✅ Descuenta automáticamente de la cuenta
- ✅ Registra en el historial con categorización

#### Ejemplos de Uso:

- Pagar pozo acumulado a beneficiario del día
- Registrar gastos operativos de la junta
- Documentar retiros de efectivo

---

### 4️⃣ **Historial de Movimientos**

**Pestaña:** "Historial"

Muestra todos los movimientos realizados en las cuentas.

#### Filtros Disponibles:

- **Tipo de Movimiento**:
  - 📥 Ingresos
  - 📤 Egresos
  - 🔄 Transferencias
- **Búsqueda por texto**: Busca en descripción y beneficiario
- **Rango de fechas**: Desde/Hasta
- **Botón "Limpiar Filtros"**: Resetea todos los filtros

#### Información por Movimiento:

- Icono según tipo (📥📤🔄)
- Descripción del movimiento
- Fecha y hora
- Monto con color (verde=ingreso, rojo=egreso)
- Cuentas involucradas (origen/destino)
- Beneficiario (si aplica)
- Notas adicionales

---

### 5️⃣ **Exportar Reportes**

**Botón:** "📥 Exportar" _(próximamente)_

Permitirá exportar reportes en formatos:

- Excel (.xlsx)
- PDF

---

## 🗂️ Tipos de Movimientos

### 📥 **INGRESO**

- Dinero que **entra** a una cuenta
- Ejemplos:
  - Pago de junta recibido de participante
  - Depósito inicial
  - Devoluciones

### 📤 **EGRESO**

- Dinero que **sale** de una cuenta
- Ejemplos:
  - Pago a beneficiario del día
  - Gastos operativos
  - Retiros de efectivo

### 🔄 **TRANSFERENCIA**

- Movimiento **entre cuentas propias**
- Ejemplos:
  - De Yape a cuenta bancaria
  - De efectivo a Yape
  - Consolidación de fondos

---

## 🔧 Comandos de Mantenimiento

### Inicializar Cuentas

```bash
node scripts/init-caja.mjs
```

Crea las 6 cuentas de caja por primera vez.

### Agregar Datos de Demostración

```bash
node scripts/seed-caja-demo.mjs
```

Agrega saldos iniciales y movimientos de prueba.

---

## 📊 Base de Datos

### Modelos Principales:

#### **CajaAccount**

- `id`: UUID único
- `tipoCuenta`: Enum (YAPE_SEBASTIAN, YAPE_PILAR, etc.)
- `saldoActual`: Decimal - saldo actual
- `umbralAlerta`: Decimal - límite para alertas (default: S/ 100)
- `notas`: String opcional
- `ultimaActualizacion`: DateTime

#### **CajaTransaction**

- `id`: UUID único
- `tipo`: Enum (INGRESO, EGRESO, TRANSFERENCIA)
- `monto`: Decimal
- `descripcion`: String
- `cuentaOrigenId`: UUID opcional (para egresos/transferencias)
- `cuentaDestinoId`: UUID opcional (para ingresos/transferencias)
- `beneficiario`: String opcional
- `categoria`: Enum opcional (ExpenseCategory)
- `notas`: String opcional
- `fecha`: DateTime
- `juntaPaymentId`: UUID opcional (vinculación con pagos de junta)

---

## 🎯 Casos de Uso Reales

### Escenario 1: Recibir Pago de Junta

1. Participante paga S/ 500 por Yape a Sebastian
2. **No se hace nada manual** - El sistema auto-registrará el ingreso cuando se marque el pago en la junta
3. El saldo de "Yape Sebastian" aumenta automáticamente

### Escenario 2: Consolidar Fondos

1. Hay S/ 3,000 en Yape Sebastian
2. Quiero transferir S/ 2,000 a cuenta bancaria Sebastian
3. Clic en **"Transferir"**
4. Origen: Yape Sebastian
5. Destino: Transferencia Sebastian
6. Monto: 2000
7. Descripción: "Consolidación semanal"
8. ✅ Ambas cuentas se actualizan instantáneamente

### Escenario 3: Pagar Pozo al Beneficiario

1. Hoy le toca pozo a Juan Pérez (S/ 1,500)
2. Hay dinero en "Efectivo"
3. Clic en **"Registrar Gasto"**
4. Cuenta: Efectivo
5. Monto: 1500
6. Descripción: "Pago de pozo"
7. Beneficiario: "Juan Pérez"
8. Categoría: "Pago a personal"
9. ✅ Se descuenta de efectivo y queda registrado

### Escenario 4: Revisar Movimientos del Mes

1. Ir a pestaña **"Historial"**
2. Clic en **"Filtros"**
3. Tipo: "Egresos"
4. Desde: 01/01/2026
5. Hasta: 31/01/2026
6. Ver lista completa de todos los gastos del mes

---

## ⚙️ Archivos del Sistema

### Frontend:

- `src/app/dashboard/junta/caja/page.tsx` - Página principal

### Backend:

- `src/app/actions/caja.ts` - Server actions

### Base de Datos:

- `src/database/schema.prisma` - Modelos CajaAccount y CajaTransaction

### Scripts:

- `scripts/init-caja.mjs` - Inicialización de cuentas
- `scripts/seed-caja-demo.mjs` - Datos de demostración

---

## 🔐 Seguridad

- ✅ Todas las operaciones usan **transacciones atómicas** de Prisma
- ✅ Validación de saldo suficiente antes de transferencias/gastos
- ✅ No se puede transferir a la misma cuenta
- ✅ Todos los montos son Decimal (precisión exacta)
- ✅ Revalidación automática de caché con `revalidatePath()`

---

## 🚧 Próximas Mejoras (Fase 4 y 5)

- [ ] Exportación a Excel/PDF
- [ ] Gráficos de evolución de saldos
- [ ] Integración automática: cuando se recibe pago de junta → registrar ingreso automático
- [ ] Notificaciones por email/SMS cuando saldo < umbral
- [ ] Reconciliación bancaria
- [ ] Reportes por categoría de gasto
- [ ] Dashboard con métricas (ingresos vs egresos del mes)

---

## 📞 Soporte

Para reportar bugs o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

**Versión:** 1.0  
**Última actualización:** Enero 2026
