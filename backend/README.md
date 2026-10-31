# Epsilon Backend - MongoDB Authentication

Backend API para autenticación de usuarios con MongoDB Atlas.

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
