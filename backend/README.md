# Epsilon Backend - Autenticación, notas y agenda

API Express con MongoDB Atlas para autenticación, notas y eventos de agenda.

`npm start` desde la raíz ejecuta Expo. El backend se inicia por separado con
`npm run dev --prefix backend` o `npm start --prefix backend`.

## Setup MongoDB Atlas (Gratis)

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (Free tier: M0 Sandbox - 512MB)
4. En "Database Access", crea un usuario de base de datos
5. En "Network Access", permite acceso desde cualquier IP (0.0.0.0/0) para desarrollo
6. En "Database", obtén tu connection string:
   - Click en "Connect" → "Connect your application"
   - Copia el connection string (mongodb+srv://...)

## Configurar Variables de Entorno

1. Copia `.env.example` a `.env`
2. Reemplaza los valores:
   ```
   MONGODB_URI=mongodb+srv://TU_USUARIO:TU_PASSWORD@cluster0.xxxxx.mongodb.net/epsilon_db?retryWrites=true&w=majority
   JWT_SECRET=genera_un_secreto_aleatorio_largo_aqui
   ```

## Instalación Local

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales de MongoDB
npm run dev
```

El servidor correrá en `http://localhost:5000`

El arranque carga `backend/.env` aunque ejecutes el comando desde la raíz. Exige
`MONGODB_URI` y `JWT_SECRET`, espera a que MongoDB conecte y crea el índice único
de eventos antes de aceptar peticiones. Si falta una variable o falla la conexión,
el proceso termina con un mensaje de error.

La plantilla de Atlas contiene marcadores de ejemplo, no credenciales reales.
Completa `MONGODB_URI` con la conexión de tu cluster; el usuario de base de datos
debe tener acceso a `epsilon_db` y Atlas debe permitir la IP del equipo que corre
el backend. No hace falta instalar MongoDB localmente al utilizar Atlas.

## Desplegar en Render (Gratis)

1. Ve a [Render](https://render.com/)
2. Crea una cuenta gratuita
3. Click "New+" → "Web Service"
4. Conecta tu repositorio de GitHub
5. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. En "Environment Variables", agrega:
   - `MONGODB_URI`: Tu connection string de MongoDB Atlas
   - `JWT_SECRET`: Un secreto aleatorio
   - `PORT`: 5000
7. Click "Deploy Web Service"

## Endpoints

### POST /api/auth/register
Registra un nuevo usuario
```json
{
  "username": "juan123",
  "email": "juan@example.com",
  "password": "password123"
}
```

### POST /api/auth/login
Inicia sesión
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

### GET /api/auth/me
Obtener usuario actual (requiere token en header: `Authorization: Bearer TOKEN`)

### Agenda

Todas las rutas usan `Authorization: Bearer TOKEN`. La cuenta se obtiene del JWT;
el servidor ignora cualquier `userId` que envíe el cliente.

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/agenda` | Listar eventos activos de la cuenta |
| GET | `/api/agenda/:id` | Consultar un evento activo |
| POST | `/api/agenda` | Crear un evento; `id` es opcional |
| PUT | `/api/agenda/:id` | Guardar, actualizar o restaurar un evento con ID estable |
| DELETE | `/api/agenda/:id` | Marcar como eliminado; responde 204, también al reintentar |

Ejemplo de cuerpo para POST o PUT:

```json
{
  "id": "agenda_mi_evento",
  "title": "Reunión de equipo",
  "description": "Preparar avances",
  "date": "2026-11-04",
  "time": "09:00"
}
```

El título admite hasta 120 caracteres y la descripción hasta 2.000. La fecha es
una fecha civil `AAAA-MM-DD` entre 1900 y 2199; la hora usa `HH:MM` de 24 horas.
`time: ""` representa todo el día. En PUT el ID de la URL es el identificador del
evento. No se usan timestamps del cliente para ordenar escrituras del servidor.

GET admite `from=AAAA-MM-DD`, `to=AAAA-MM-DD` e `includeDeleted=true`. Este último
incluye las eliminaciones necesarias para sincronizar otros dispositivos.
Los registros eliminados se conservan en MongoDB; PUT permite restaurarlos.
Reintentar POST con el mismo ID devuelve el registro existente sin modificarlo.

### Sincronización de Agenda

La app guarda primero en AsyncStorage, en una clave propia de cada cuenta. Cada
evento conserva su ID y un estado pendiente, incluyendo ediciones y eliminaciones.
La sincronización sube los pendientes con PUT/DELETE y después descarga el estado
remoto con `includeDeleted=true`. Si falla, el cambio permanece guardado para
reintentarlo. Una edición realizada durante una petición sigue pendiente.

Se intenta sincronizar al abrir Agenda, después de guardar/eliminar/restaurar,
al recuperar conexión y cada 30 segundos mientras la app está abierta. El botón
«Sincronizar» permite hacerlo manualmente. Se requiere una sesión real; los
eventos creados con el acceso de desarrollo sin login permanecen locales y no
se asignan automáticamente a una cuenta.

La política actual entre dispositivos es que la última escritura recibida por el
servidor prevalece. No hay combinación automática de ediciones simultáneas.

### Dirección del backend en la app

`EXPO_PUBLIC_API_URL` tiene prioridad en Android, iOS y web. Puede definirse en el
`.env` de la raíz (distinto de `backend/.env`):

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Para un teléfono físico utiliza la IP local del equipo o una URL pública. Reinicia
Expo después de cambiar la configuración. La base de datos nunca se conecta
directamente desde el teléfono.

### Pruebas

Desde la raíz:

```bash
npm test --prefix backend
npm run test:agenda
```

Las pruebas del backend ejercitan rutas HTTP, JWT, validaciones y separación por
cuenta con un adaptador de persistencia en memoria; también validan el esquema
real de Mongoose. Las de Agenda cubren almacenamiento, fechas y sincronización.
Estas pruebas no sustituyen una comprobación contra tu cluster de Atlas.

## Estructura del Proyecto

```
backend/
├── config/
│   └── db.js           # Conexión MongoDB
├── controllers/
│   └── authController.js  # Lógica de autenticación
├── middleware/
│   └── auth.js         # Middleware JWT
├── models/
│   └── User.js         # Modelo de usuario
├── routes/
│   └── auth.js         # Rutas de autenticación
├── .env.example        # Plantilla de variables
├── package.json
└── server.js           # Entry point
```
