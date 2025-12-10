# API de Autenticación - Guía de Uso

## Endpoints Disponibles

### 1. GET /api/auth/users

Obtiene la lista de usuarios activos para mostrar en el selector de perfil.

**Request:**
```bash
GET http://localhost:3000/api/auth/users
```

**Response exitoso (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid-matias",
      "name": "Matías",
      "avatar": null,
      "role": "EJECUTIVO"
    },
    {
      "id": "uuid-tomas",
      "name": "Tomás",
      "avatar": null,
      "role": "GESTOR"
    }
  ]
}
```

---

### 2. POST /api/auth/login

Autentica un usuario mediante su ID y PIN.

**Request:**
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "userId": "uuid-del-usuario",
  "pin": "1234"
}
```

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Bienvenido, Matías!",
  "user": {
    "id": "uuid-matias",
    "name": "Matías",
    "email": "matias@yunta.local",
    "role": "EJECUTIVO",
    "status": "ACTIVE",
    "failedLoginAttempts": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response PIN incorrecto (401):**
```json
{
  "success": false,
  "message": "PIN incorrecto. Te quedan 2 intento(s).",
  "remainingAttempts": 2
}
```

**Response usuario bloqueado (423):**
```json
{
  "success": false,
  "message": "Cuenta bloqueada temporalmente. Intenta de nuevo en 5 minuto(s).",
  "isLocked": true
}
```

**Response validación fallida (400):**
```json
{
  "success": false,
  "message": "El PIN debe contener entre 4 y 6 dígitos."
}
```

---

## Pruebas con cURL

### Obtener usuarios
```bash
curl http://localhost:3000/api/auth/users
```

### Login exitoso (PIN correcto)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid-del-usuario","pin":"1234"}'
```

### Login fallido (PIN incorrecto)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid-del-usuario","pin":"0000"}'
```

---

## Códigos HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 200 | OK | Login exitoso |
| 400 | Bad Request | Validación fallida (datos faltantes/inválidos) |
| 401 | Unauthorized | PIN incorrecto |
| 423 | Locked | Usuario bloqueado temporalmente |
| 500 | Internal Server Error | Error del servidor |

---

## Flujo de Autenticación

1. **Frontend carga** → GET `/api/auth/users` → Muestra selector de perfiles
2. **Usuario selecciona perfil** → Muestra campo de PIN
3. **Usuario ingresa PIN** → POST `/api/auth/login` con `{userId, pin}`
4. **Backend valida** → Responde según resultado:
   - ✅ PIN correcto → Retorna datos del usuario, crea sesión
   - ❌ PIN incorrecto → Retorna intentos restantes
   - 🔒 Bloqueado → Retorna tiempo de espera

---

## Seguridad Implementada

- ✅ PINs hasheados con bcrypt (10 rounds)
- ✅ Máximo 3 intentos fallidos
- ✅ Bloqueo temporal de 5 minutos
- ✅ Auto-desbloqueo cuando expira el tiempo
- ✅ Validación de formato de PIN (4-6 dígitos)
- ✅ Datos sensibles (pinHash) nunca se devuelven
- ✅ Rate limiting por usuario (vía contador)
- ✅ Headers de seguridad en Next.js config

---

## Próximos Pasos

1. Implementar gestión de sesiones (NextAuth.js o cookies seguras)
2. Agregar middleware para proteger rutas según rol
3. Habilitar RLS en Supabase
4. Agregar rate limiting global (Upstash Redis)
