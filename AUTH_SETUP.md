# Configuración de Autenticación - Epsilon Retrieve

## Resumen de Implementación

✅ Backend Node.js/Express con MongoDB Atlas
✅ Endpoints de autenticación (register, login, getMe)
✅ Cliente React Native con AuthContext actualizado
✅ Offline-first con Dexie.js
✅ Sincronización automática cuando hay conexión

## Pasos para Completar el Setup

### 1. Configurar MongoDB Atlas (Gratis)

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (M0 Sandbox - 512MB gratis)
4. En "Database Access":
   - Crea un usuario de base de datos
   - Guarda el username y password
5. En "Network Access":
   - Agrega IP: `0.0.0.0/0` (para desarrollo)
6. En "Database":
   - Click en "Connect" → "Connect your application"
   - Copia el connection string

### 2. Configurar Backend Local

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb+srv://TU_USUARIO:TU_PASSWORD@cluster0.xxxxx.mongodb.net/epsilon_db?retryWrites=true&w=majority
JWT_SECRET=genera_un_secreto_aleatorio_muy_largo_aqui
NODE_ENV=development
```

Iniciar servidor:
```bash
npm run dev
```

### 3. Configurar Cliente

Crea `.env` en la raíz del proyecto:
```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Desplegar Backend en Render (Gratis)

1. Ve a [Render](https://render.com/)
2. Crea cuenta y conecta tu repositorio GitHub
3. Crea "Web Service":
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Agrega Environment Variables:
   - `MONGODB_URI`: Tu connection string de MongoDB Atlas
   - `JWT_SECRET`: Un secreto aleatorio
   - `PORT`: 5000
5. Deploy y copia la URL generada

6. Actualiza `.env` del cliente:
```
EXPO_PUBLIC_API_URL=https://TU_APP_RENDER.onrender.com/api
```

## Estructura de Archivos

### Backend (`/backend`)
```
backend/
├── config/db.js              # Conexión MongoDB
├── controllers/authController.js  # Lógica de auth
├── middleware/auth.js         # Middleware JWT
├── models/User.js            # Modelo de usuario
├── routes/auth.js            # Rutas API
├── server.js                 # Entry point
└── package.json
```

### Cliente (`/src`)
```
src/
├── context/AuthContext.tsx    # Contexto de autenticación
├── services/
│   ├── api.ts                # Cliente Axios
│   └── syncService.ts        # Servicio de sincronización
├── db/index.ts               # Configuración Dexie.js
└── types/index.ts            # Tipos TypeScript
```

## Endpoints API

### POST /api/auth/register
```json
{
  "username": "juan123",
  "email": "juan@example.com",
  "password": "password123"
}
```

### POST /api/auth/login
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

### GET /api/auth/me
Header: `Authorization: Bearer TOKEN`

## Funcionalidad Offline-First

- **Sin conexión**: Los datos se guardan en Dexie.js (IndexedDB)
- **Acciones pendientes**: Se guardan para sincronizar cuando haya conexión
- **Sincronización automática**: Cuando se detecta conexión, se procesan acciones pendientes
- **Fallback offline**: Si la API falla, se cargan datos locales

## Testing Local

1. Inicia el backend: `cd backend && npm run dev`
2. Inicia Expo: `npm start`
3. Prueba registro y login
4. Para probar offline: desconecta internet y prueba las acciones

## Seguridad

- Contraseñas hasheadas con bcryptjs
- JWT tokens con expiración (30 días)
- Validación de inputs en backend
- CORS configurado
- Variables de entorno para secrets sensibles
