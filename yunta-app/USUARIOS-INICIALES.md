# Instrucciones para Crear Usuarios Iniciales en YUNTA

## Paso 1: Abrir Prisma Studio

1. Asegúrate de que Prisma Studio esté corriendo (http://localhost:51212)
2. Haz clic en la tabla **users** en el panel izquierdo

## Paso 2: Agregar los 5 Usuarios

Para cada usuario, haz clic en "Add record" y copia estos valores:

### Usuario 1: Matías (EJECUTIVO)
```
name: Matías
email: matias@yunta.local
role: EJECUTIVO
pinHash: $2b$10$c.1.28V2uXNoI8UvcAzNyOGHnYP7GcR.X.1M2VUcYrMe/BJVQjrS6
status: ACTIVE
failedLoginAttempts: 0
```
**PIN de prueba: 1234**

### Usuario 2: Tomás (GESTOR)
```
name: Tomás
email: tomas@yunta.local
role: GESTOR
pinHash: $2b$10$cxUxC/8yfQo9k5gs9SySH.tv04pUiL0BJSs0FG/vcOrclPDFpqqdi
status: ACTIVE
failedLoginAttempts: 0
```
**PIN de prueba: 2345**

### Usuario 3: Pilar (GESTOR)
```
name: Pilar
email: pilar@yunta.local
role: GESTOR
pinHash: $2b$10$ig.vZt4obIBj21sjvGOcyu2J7BvLlfqcdxlNV3toaoDX3hKlD/yve
status: ACTIVE
failedLoginAttempts: 0
```
**PIN de prueba: 3456**

### Usuario 4: Ariana (BENEFICIARIO)
```
name: Ariana
email: ariana@yunta.local
role: BENEFICIARIO
pinHash: $2b$10$bXID8MeH3UUSN2R391F8SuZevwI5NMZYb7Q8HJmy80bL3vKIqvIQW
status: ACTIVE
failedLoginAttempts: 0
```
**PIN de prueba: 4567**

### Usuario 5: Sthefany (BENEFICIARIO)
```
name: Sthefany
email: sthefany@yunta.local
role: BENEFICIARIO
pinHash: $2b$10$tmSfMRAqkaexHDdtyYecVeMVA9zn.I45AZR3QesNP3McI8Q50bB8W
status: ACTIVE
failedLoginAttempts: 0
```
**PIN de prueba: 5678**

## Campos Opcionales

Puedes dejar en blanco:
- phone
- avatar
- bio
- birthDate
- lastLockedAt
- lastLoginAt

Los campos `id`, `createdAt` y `updatedAt` se generarán automáticamente.

## Paso 3: Guardar

Después de agregar cada usuario, haz clic en "Save 1 change" (botón verde).

## PINs de Prueba para Testing

| Usuario | Rol | PIN |
|---------|-----|-----|
| Matías | EJECUTIVO | 1234 |
| Tomás | GESTOR | 2345 |
| Pilar | GESTOR | 3456 |
| Ariana | BENEFICIARIO | 4567 |
| Sthefany | BENEFICIARIO | 5678 |

**IMPORTANTE:** Estos PINs son solo para desarrollo. En producción, los usuarios deben crear sus propios PINs seguros.
