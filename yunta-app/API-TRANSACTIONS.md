# API de Transacciones - Documentación

## Endpoints Disponibles

### 1. POST /api/transactions

Crea una nueva transacción y aplica automáticamente la regla 300/50 para ingresos.

**Regla 300/50:**
Cuando se registra un INGRESO (type: "IN"), automáticamente se crean 2 gastos adicionales:
- 300 soles → RESERVATION_FUNDS (Fondo para Junta Semanal)
- 50 soles → PAYROLL (Pago de Personal)

**Request:**
```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json

{
  "userId": "uuid-del-usuario",
  "amount": 1000,
  "type": "IN",  // "IN" para ingreso, "OUT" para gasto
  "method": "CASH",  // CASH, DEBIT, CREDIT_BCP, YAPE
  "category": null,  // Requerido solo para gastos (OUT)
  "description": "Ingreso diario",
  "notes": "Opcional",
  "date": "2024-01-15T10:00:00.000Z"  // Opcional, por defecto: now()
}
```

**Response exitoso - Ingreso con regla 300/50 (201):**
```json
{
  "success": true,
  "message": "Ingreso registrado exitosamente. Se aplicó la regla 300/50: 300 soles reservados para junta semanal y 50 soles para personal.",
  "transactions": [
    {
      "id": "uuid-1",
      "amount": 1000,
      "type": "IN",
      "method": "CASH",
      "category": null,
      "description": "Ingreso diario",
      "userId": "uuid-del-usuario",
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "amount": 300,
      "type": "OUT",
      "method": "CASH",
      "category": "RESERVATION_FUNDS",
      "description": "Fondo de Reserva - Junta Semanal (Auto-generado...)",
      "userId": "uuid-del-usuario",
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "uuid-3",
      "amount": 50,
      "type": "OUT",
      "method": "CASH",
      "category": "PAYROLL",
      "description": "Pago de Personal (Auto-generado...)",
      "userId": "uuid-del-usuario",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 3
}
```

**Request de Gasto:**
```json
{
  "userId": "uuid-del-usuario",
  "amount": 50,
  "type": "OUT",
  "method": "YAPE",
  "category": "FOOD",  // Requerido para gastos
  "description": "Almuerzo familiar"
}
```

**Response exitoso - Gasto simple (201):**
```json
{
  "success": true,
  "message": "Gasto registrado exitosamente.",
  "transactions": [
    {
      "id": "uuid-4",
      "amount": 50,
      "type": "OUT",
      "method": "YAPE",
      "category": "FOOD",
      "description": "Almuerzo familiar",
      "userId": "uuid-del-usuario",
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Errores de validación (400):**
```json
{
  "success": false,
  "message": "El campo amount es requerido y debe ser mayor a 0."
}
```

---

### 2. GET /api/transactions

Obtiene la lista de transacciones del usuario con filtros opcionales.

**Request:**
```bash
GET http://localhost:3000/api/transactions?userId=uuid&type=IN&limit=50
```

**Parámetros de búsqueda:**
- `userId` (requerido) - ID del usuario
- `type` (opcional) - Filtrar por tipo: "IN" o "OUT"
- `category` (opcional) - Filtrar por categoría
- `limit` (opcional) - Límite de resultados (default: 100)

**Response exitoso (200):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid-1",
      "amount": 1000,
      "type": "IN",
      "method": "CASH",
      "category": null,
      "description": "Ingreso diario",
      "date": "2024-01-15T10:00:00.000Z",
      "user": {
        "id": "uuid",
        "name": "Matías",
        "avatar": null
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Categorías de Gasto

```typescript
enum ExpenseCategory {
  FOOD              // Comida y alimentos
  MOBILITY          // Transporte
  SHOPPING          // Compras generales
  ERRANDS           // Encargos
  MERCHANDISE       // Mercadería (importante para cálculo de ganancia)
  HEALTH            // Salud y medicinas
  EDUCATION         // Educación
  ENTERTAINMENT     // Entretenimiento
  UTILITIES         // Servicios (luz, agua, internet)
  OTHER             // Otros gastos
  RESERVATION_FUNDS // Fondo de reserva (auto-generado)
  PAYROLL           // Pago a personal (auto-generado)
}
```

---

## Métodos de Pago

```typescript
enum PaymentMethod {
  CASH       // Efectivo
  DEBIT      // Tarjeta de débito
  CREDIT_BCP // BCP Visa Dorada
  YAPE       // Yape
}
```

---

## Lógica de Negocio: Regla 300/50

### Objetivo:
Separar automáticamente fondos reservados de cada ingreso para:
1. **Junta Semanal**: 300 soles que se acumulan para gastos comunitarios
2. **Pago de Personal**: 50 soles para pago de empleados

### Implementación:
- **Atomicidad**: Las 3 transacciones se crean en una sola transacción de BD
- **Método consistente**: Los gastos automáticos usan el mismo método de pago que el ingreso
- **Trazabilidad**: Las transacciones automáticas incluyen referencia al ingreso original
- **Balance real**: El saldo disponible refleja el dinero real (ingreso - 350 soles)

### Ejemplo de flujo:
```
Usuario registra ingreso de 1000 soles en efectivo
↓
Sistema crea:
  1. Ingreso: +1000 soles (CASH)
  2. Gasto automático: -300 soles (RESERVATION_FUNDS, CASH)
  3. Gasto automático: -50 soles (PAYROLL, CASH)
↓
Balance disponible: 1000 - 300 - 50 = 650 soles
```

---

## Pruebas con cURL

### Crear ingreso (activa regla 300/50)
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "tu-user-id",
    "amount": 1000,
    "type": "IN",
    "method": "CASH",
    "description": "Ingreso diario"
  }'
```

### Crear gasto simple
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "tu-user-id",
    "amount": 50,
    "type": "OUT",
    "method": "YAPE",
    "category": "FOOD",
    "description": "Almuerzo"
  }'
```

### Listar transacciones
```bash
curl "http://localhost:3000/api/transactions?userId=tu-user-id&limit=20"
```

### Filtrar solo ingresos
```bash
curl "http://localhost:3000/api/transactions?userId=tu-user-id&type=IN"
```

---

## Códigos HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 201 | Created | Transacción creada exitosamente |
| 200 | OK | Transacciones obtenidas exitosamente |
| 400 | Bad Request | Validación fallida |
| 500 | Internal Server Error | Error del servidor |

---

## Próximos Steps

1. Implementar endpoint para calcular balance: `GET /api/transactions/balance`
2. Agregar endpoint para estadísticas: `GET /api/transactions/stats`
3. Implementar soft delete en lugar de eliminación permanente
4. Agregar paginación para listado de transacciones
