This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Guía de Pruebas: Funcionalidad Offline, Cierre e Idempotencia

Se ha integrado un sistema robusto para el manejo de finanzas en "Yunta App" asegurando la consistencia entre cobros, la cuenta de origen (Yape, Efectivo) y soporte offline. 

A continuación, los pasos para validar el sistema:

### 1. Prueba Offline Real (Pagos sin Internet)
- Inicia el servidor `npm run dev` y abre `http://localhost:3000/dashboard/junta`.
- **Desconecta tu internet** (Puedes hacerlo desactivando tu Wi-Fi o usando la pestaña *Network* de Chrome DevTools marcando "Offline").
- Añade un nuevo pago (Ej: $50 por Yape a un participante).
- Verás un aviso que indica: **"Encolado Offline... el pago se sincronizará automáticamente cuando vuelva internet"**.
- En la interfaz aparecerá un indicador: **⏳ 1 Pendientes** junto al título "Agenda de la Junta".
- **Reconecta tu internet** y presiona el botón "Reintentar" o simplemente espera a que tu navegador despache el evento nativo de red. El indicador de pendientes desaparecerá, y tu pago se habrá guardado con éxito.

### 2. Prueba de Idempotencia (Prevención de Doble Cobro)
- La app genera de forma única un `clientTxId` antes de enviar el pago por red.
- Si el internet es inestable (ej: el backend recibe el pago, pero el internet falla antes de que te llegue la respuesta visual), el pago se guarda como "Pendiente" y la UI lo tratará de lanzar de nuevo.
- Al volver internet, el Worker intentará sincronizar de nuevo ese pago usando el mismo `clientTxId`.
- El backend detectará esto y devolverá `success: true` protegiendo que **no se cree un segundo pago** ni que se duplique el ingreso en el módulo "Caja". Puedes validar esta prevención corriendo la batería de pruebas automatizadas: `npm run test` (verifica el test: Idempotencia).

### 3. Prueba de Cierre Fuerte (Snapshots)
- El botón de "Cerrar Día" ejecuta ahora una lógica de control estricto.
- Al cerrarse un día, se calcúla el arreglo de participantes, cuánto debe haber de `expected` y cuánto se recogió de `collected`.
- Esto se guarda permanentemente como un JSON en la columna `snapshotJson` de tu base de datos y se etiqueta un `closedAt`. De este modo, los reportes mostrarán siempre ese congelamiento histórico intocable.
- Prueba cobrar un pago en un día cerrado: El test 3 confirma que el Backend lo **rechaza**.

### Testing (Automático con Vitest)
La lógica crítica se audita automáticamente. Corre en la terminal:
\`\`\`bash
npm run test
\`\`\`
*(Debe pasar con los 6 casos marcados en verde, usando un IndexedDB virtual)*

---

## Deploy on Vercel
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
