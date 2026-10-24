# Epsilon Retrieve

Aplicación de notas, agenda y tareas estilo Microsoft To Do con React Native y Expo.

http://localhost:8081/login

## Características

- **Autenticación**: Login y signup de usuarios
- **Notas**: Crear, ver y eliminar notas
- **Agenda**: Gestión de eventos con fecha y hora
- **Tareas**: Lista de tareas estilo Microsoft To Do con prioridades
- **Offline-First**: Arquitectura preparada para sincronización
- **MongoDB**: Preparado para integración con backend

## Estructura del Proyecto

```
epsilon_retrieve/
├── app/                      # Expo Router (file-based routing)
│   ├── menu.tsx             # Pantalla principal con carousel 3D
│   ├── notes.tsx            # Pantalla de notas
│   ├── agenda.tsx           # Pantalla de agenda
│   ├── todos.tsx            # Pantalla de tareas
│   ├── login.tsx            # Pantalla de login
│   ├── signup.tsx           # Pantalla de registro
│   └── _layout.tsx          # Layout principal (control de navegación)
├── src/
│   ├── context/
│   │   └── AuthContext.tsx  # Contexto de autenticación
│   ├── screens/
│   │   ├── auth/            # Pantallas de autenticación
│   │   ├── menu/            # Pantalla del menú con carousel
│   │   ├── notes/           # Pantalla de notas
│   │   ├── agenda/          # Pantalla de agenda
│   │   └── todos/           # Pantalla de tareas
│   └── types/
│       └── index.ts         # Tipos TypeScript
└── package.json
```

## Navegación de Pantallas

### Flujo Principal

```
Login/Signup → Menu (Carousel) → Secciones (Notas/Agenda/Tareas) → Volver al Menu
```

### Código que Controla la Navegación

#### 1. **Layout Principal** (`app/_layout.tsx`)

Este archivo es el corazón de la navegación. Define qué pantallas están disponibles según el estado de autenticación.

**Ubicación**: `app/_layout.tsx` (líneas 17-31)

```typescript
return (
  <Stack screenOptions={{ headerShown: false }}>
    {!isAuthenticated ? (
      // Pantallas cuando NO está autenticado
      <>
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="signup" options={{ title: 'Signup' }} />
      </>
    ) : (
      // Pantallas cuando ESTÁ autenticado
      <>
        <Stack.Screen name="menu" options={{ title: 'Menu' }} />
        <Stack.Screen name="notes" options={{ title: 'Notas' }} />
        <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
        <Stack.Screen name="todos" options={{ title: 'Tareas' }} />
      </>
    )}
  </Stack>
);
```

**Función**:
- Usa `Stack` navigator de Expo Router
- Condiciona las pantallas según `isAuthenticated` del AuthContext
- Si `!isAuthenticated`: solo muestra login y signup
- Si `isAuthenticated`: muestra menu, notes, agenda, todos

#### 2. **AuthContext** (`src/context/AuthContext.tsx`)

Maneja el estado de autenticación y provee las funciones de login/signup/logout.

**Ubicación**: `src/context/AuthContext.tsx` (líneas 15-69)

**Estado clave**:
- `user`: Usuario autenticado o null
- `isAuthenticated`: Boolean derivado de `!!user`
- `loading`: Estado de carga durante operaciones

**Funciones de navegación**:
- `login()`: Establece el usuario (líneas 20-32)
- `signup()`: Establece el usuario (líneas 34-45)
- `logout()`: Elimina el usuario (líneas 47-53)

#### 3. **Login Screen** (`src/screens/auth/LoginScreen.tsx`)

Navega al menú después de un login exitoso.

**Ubicación**: `src/screens/auth/LoginScreen.tsx` (líneas 22-33)

```typescript
const handleLogin = async () => {
  // ... validación
  try {
    await login(email, password);
    router.replace('/menu');  // ← Navegación al menú
  } catch (error) {
    Alert.alert('Error', 'No se pudo iniciar sesión');
  }
};
```

#### 4. **Signup Screen** (`src/screens/auth/SignupScreen.tsx`)

Navega al menú después de un registro exitoso.

**Ubicación**: `src/screens/auth/SignupScreen.tsx` (líneas 33-38)

```typescript
try {
  await signup(email, password, name);
  router.replace('/menu');  // ← Navegación al menú
} catch (error) {
  Alert.alert('Error', 'No se pudo crear la cuenta');
}
```

#### 5. **Menu Screen** (`src/screens/menu/MenuScreen.tsx`)

Pantalla principal con carousel 3D. Permite seleccionar una sección y luego entrar.

**Ubicación**: `src/screens/menu/MenuScreen.tsx`

**Selección de sección** (líneas 19-29):
```typescript
const handleTabChange = (tabId: string, index: number) => {
  if (tabId === 'pomodoros') return;

  Animated.timing(animatedValue, {
    toValue: index,
    duration: 500,
    useNativeDriver: true,
  }).start();

  setActiveTab(tabId);  // Solo selecciona, no navega
};
```

**Entrar a sección** (líneas 31-36):
```typescript
const handleEnterSection = () => {
  const selectedTab = tabs.find(tab => tab.id === activeTab);
  if (selectedTab && selectedTab.route) {
    router.push(selectedTab.route);  // ← Navega a la sección seleccionada
  }
};
```

**Cerrar sesión** (líneas 38-41):
```typescript
const handleLogout = async () => {
  await logout();
  router.replace('/login');  // ← Navega al login
};
```

#### 6. **Pantallas de Secciones** (Notes, Agenda, Todos)

Cada pantalla tiene un botón "Volver" que regresa al menú.

**Ejemplo - Notes Screen** (`src/screens/notes/NotesScreen.tsx`):

**Ubicación**: `src/screens/notes/NotesScreen.tsx` (líneas 95-106)

```typescript
<View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
    <Text style={styles.backButtonText}>← Volver</Text>
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Mis Notas</Text>
  {/* ... botón agregar */}
</View>
```

**Lo mismo en**:
- `src/screens/agenda/AgendaScreen.tsx` (líneas 112-123)
- `src/screens/todos/TodosScreen.tsx` (líneas 154-165)

### Rutas del Sistema

| Ruta | Pantalla | Archivo |
|------|----------|---------|
| `/login` | Login | `app/login.tsx` → `src/screens/auth/LoginScreen.tsx` |
| `/signup` | Registro | `app/signup.tsx` → `src/screens/auth/SignupScreen.tsx` |
| `/menu` | Menú principal | `app/menu.tsx` → `src/screens/menu/MenuScreen.tsx` |
| `/notes` | Notas | `app/notes.tsx` → `src/screens/notes/NotesScreen.tsx` |
| `/agenda` | Agenda | `app/agenda.tsx` → `src/screens/agenda/AgendaScreen.tsx` |
| `/todos` | Tareas | `app/todos.tsx` → `src/screens/todos/TodosScreen.tsx` |

### Resumen del Flujo

1. **Inicio**: App carga → `app/_layout.tsx` verifica `isAuthenticated`
2. **No autenticado**: Muestra `/login`
3. **Login exitoso**: `LoginScreen` llama `router.replace('/menu')`
4. **En el menú**: Usuario selecciona sección en carousel → presiona "Entrar"
5. **En sección**: Usuario puede trabajar → presiona "← Volver" → `router.back()`
6. **Cerrar sesión**: Menu llama `router.replace('/login')`

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el proyecto:
```bash
npm start
```

3. Ejecutar en dispositivo/emulador:
```bash
npm run android    # Para Android
npm run ios        # Para iOS
npm run web        # Para web
```

## Arquitectura Offline-First

La aplicación está diseñada para funcionar offline-first:

- **Estado Local**: Los datos se guardan localmente primero
- **Flags de Sincronización**: Cada entidad tiene un campo `synced` para rastrear cambios
- **Soft Delete**: Las entidades tienen un campo `deleted` para eliminación suave
- **Timestamps**: `createdAt` y `updatedAt` para control de versiones

## Próximos Pasos

1. Implementar almacenamiento local (AsyncStorage o SQLite)
2. Crear backend con MongoDB
3. Implementar servicio de sincronización
4. Agregar manejo de conflictos
5. Implementar autenticación real

## Tecnologías

- React Native
- Expo
- Expo Router
- TypeScript
- MongoDB (futuro)
