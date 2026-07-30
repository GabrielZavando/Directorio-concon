# Directorio de Empresas de Concón - Backend API

API REST desarrollada con **NestJS 10** y **Firebase** para el Directorio de Empresas de Concón.

## 🚀 Características

- **Framework**: NestJS 10 con TypeScript 5+
- **Base de datos**: Firebase Firestore
- **Autenticación**: Firebase Authentication
- **Storage**: Firebase Storage
- **Cache**: Redis (opcional, fallback a memoria)
- **Documentación**: Swagger/OpenAPI
- **Validación**: class-validator + class-transformer
- **Rate Limiting**: Configurable por endpoint
- **Logging**: Winston con formato estructurado
- **Testing**: Jest + Supertest

## 📋 Funcionalidades

### Core
- ✅ CRUD completo de empresas, categorías y barrios
- ✅ Sistema de autenticación con Firebase Auth
- ✅ Gestión de usuarios con roles (admin/owner/member)
- ✅ Sistema de solicitudes y aprobaciones

### Sistema de Planes Premium
- ✅ Planes gratuito y premium
- ✅ Gestión de suscripciones y pagos
- ✅ Recursos digitales exclusivos
- ✅ Chat empresarial para networking

### Funcionalidades Avanzadas
- ✅ Sistema de reviews y respuestas
- ✅ Integración con IA (OpenAI + Qdrant)
- ✅ Analytics y métricas avanzadas
- ✅ Upload de imágenes y archivos

## 🛠️ Instalación

### Requisitos
- Node.js >= 18.0.0
- npm >= 9.0.0
- Redis (opcional, recomendado para producción)

### 1. Clonar y configurar dependencias

```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
```

### 2. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona el proyecto `directorio-concon`
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Genera una nueva clave privada
5. Descarga el archivo JSON de la cuenta de servicio

**Opción A: Archivo `firebase-admin.json` (recomendado para dev/VPS)**

Coloca el JSON de la cuenta de servicio descargado como `firebase-admin.json` en la
**raíz del repositorio** (junto al `package.json` del monorepo):

```bash
# Desde la raíz del repo
cp ~/Downloads/directorio-concon-*.json firebase-admin.json
```

> ⚠️ `firebase-admin.json` está en `.gitignore` y **nunca debe commitearse**.

Cuando el archivo existe y `FIREBASE_ENABLED` no es `false`, Firebase se
**auto-habilita** al arrancar (no se requieren variables `FIREBASE_*`). Si el
archivo está en otra ruta, apúntalo con `FIREBASE_ADMIN_CREDENTIALS_PATH`:

```bash
FIREBASE_ADMIN_CREDENTIALS_PATH=/secret/firebase-admin.json
```

**Opción B: Variable de entorno con JSON completo**
```bash
# Establecer la variable de entorno con el contenido completo del JSON
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "..."}'
```

**Opción C: Usar campos individuales**
```bash
# Editar .env con los valores del archivo JSON descargado
FIREBASE_PROJECT_ID=directorio-concon
FIREBASE_PRIVATE_KEY_ID=abc123...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU-CLAVE-PRIVADA-AQUI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@directorio-concon.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789...
FIREBASE_STORAGE_BUCKET=directorio-concon.appspot.com
```

### Modo sin Firebase (desarrollo local)

El backend puede arrancar **sin** un proyecto Firebase configurado. La habilitación
de Firebase sigue esta precedencia (evaluada en `FirebaseConfig`):

1. Si `FIREBASE_ENABLED=false`, Firebase **no** se inicializa (modo sin Firebase).
2. Si `FIREBASE_ENABLED` no es `false` y existe un archivo de credenciales
   (`FIREBASE_ADMIN_CREDENTIALS_PATH`, `firebase-admin.json` en la raíz del repo, o
   en `../firebase-admin.json`), Firebase **auto-se habilita** usando ese archivo.
3. Si no hay archivo pero están definidas las variables `FIREBASE_*` (Opción B/C),
   se usan esas credenciales cuando `FIREBASE_ENABLED=true`.

Comportamiento:

- **Sin credenciales ni `FIREBASE_ENABLED=true`** (valor por defecto `false`): el
  backend inicia y sirve `/api/v1/health` y la estructura de la API, pero **no**
  inicializa Firebase. Los endpoints que requieren Firestore (ej.
  `GET /api/v1/empresas`) devuelven `503` con el mensaje
  `Firebase is not enabled. Set FIREBASE_ENABLED=true and provide credentials.`
  Ideal para desarrollo local sin Firebase.
- **Con `firebase-admin.json` presente**: Firebase se auto-habilita al arrancar; el
  log de arranque y `/api/v1/health` reportan `services.firebase: "connected"`.
- **`FIREBASE_ENABLED=true` con credenciales inválidas**: el arranque falla con un
  error claro (fail-fast).

Para habilitar Firebase, la forma más simple es colocar `firebase-admin.json` en la
raíz del repo (Opción A) o establecer `FIREBASE_ENABLED=true` y completar la
Opción B/C con los valores del archivo JSON descargado.

### 3. Configurar Redis (Opcional)

**Docker**:
```bash
docker run -d --name redis-directorio -p 6379:6379 redis:7-alpine
```

**Local** (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

Si no tienes Redis, el sistema usará cache en memoria automáticamente.

### 4. Verificar instalación

```bash
# Compilar el proyecto para verificar que todo está correcto
npm run build

# Si la compilación es exitosa, iniciar el servidor
npm run start:dev
```

### 5. Iniciar el servidor

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Debug
npm run start:debug
```

El servidor estará disponible en:
- **API**: http://localhost:3000/api/v1
- **Documentación**: http://localhost:3000/api/docs (solo en desarrollo)
- **Health Check**: http://localhost:3000/api/v1/health

### ⚠️ Vulnerabilidades de dependencias

Al instalar las dependencias, npm puede reportar algunas vulnerabilidades. Estas son principalmente en dependencias de desarrollo y no afectan la funcionalidad:

```bash
# Para revisar las vulnerabilidades
npm audit

# Para aplicar fixes automáticos (con precaución)
npm audit fix

# Para fixes agresivos (puede causar breaking changes)
npm audit fix --force
```

Las vulnerabilidades reportadas están principalmente en:
- `protobufjs` (dependencia de Firebase)
- `tmp` (dependencia de herramientas de desarrollo)

Estas no afectan la seguridad del API en producción.

## 📖 Estructura del Proyecto

```
src/
├── app.module.ts              # Módulo principal de la aplicación
├── main.ts                    # Punto de entrada de la aplicación
├── config/                    # Configuraciones
│   ├── app.config.ts          # Configuración general
│   ├── firebase.config.ts     # Configuración Firebase
│   └── validation.config.ts   # Esquemas de validación
├── common/                    # Utilidades compartidas
│   ├── controllers/           # Controladores globales
│   ├── services/             # Servicios comunes (Firebase, etc.)
│   ├── filters/              # Filtros de excepciones
│   ├── interceptors/         # Interceptores (logging, transform)
│   ├── guards/               # Guards de autenticación
│   ├── decorators/           # Decoradores personalizados
│   ├── pipes/                # Pipes de validación
│   └── dto/                  # DTOs base
└── modules/                  # Módulos de funcionalidad
    ├── empresas/             # Gestión de empresas
    ├── categorias/           # Gestión de categorías  
    ├── barrios/              # Gestión de barrios
    ├── usuarios/             # Gestión de usuarios
    ├── auth/                 # Autenticación
    ├── planes/               # Sistema de planes
    ├── suscripciones/        # Gestión de suscripciones
    ├── pagos/                # Procesamiento de pagos
    ├── recursos-digitales/   # Recursos premium
    ├── chat-empresarial/     # Chat entre empresas
    ├── reviews/              # Sistema de reseñas
    ├── ai/                   # Funcionalidades de IA
    └── analytics/            # Métricas y analytics
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Servidor con hot-reload
npm run start:debug        # Servidor en modo debug

# Producción
npm run build              # Compilar TypeScript
npm run start:prod         # Servidor en producción

# Testing
npm run test               # Tests unitarios
npm run test:watch         # Tests en modo watch
npm run test:cov           # Tests con cobertura
npm run test:e2e           # Tests end-to-end

# Calidad de código
npm run lint               # ESLint
npm run format             # Prettier

# Base de datos
npm run seed               # Poblar datos iniciales
npm run migrate            # Migrar datos desde Supabase
```

## 🌍 Variables de Entorno

Ver `.env.example` para la configuración completa. Variables principales:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `FIREBASE_ENABLED` | Habilita Firebase al arrancar. Si es `false`, nunca inicializa. Si no es `false` y existe un archivo de credenciales, **auto-se habilita**. Default `false` | `false` |
| `FIREBASE_ADMIN_CREDENTIALS_PATH` | Ruta a un archivo de cuenta de servicio JSON. Tiene precedencia sobre `firebase-admin.json` en la raíz | `/secret/firebase-admin.json` |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase (opcional; se omite si se usa archivo/credenciales JSON) | `directorio-concon` |
| `FIREBASE_PRIVATE_KEY` | Clave privada de la cuenta de servicio (opcional; se omite si se usa archivo/credenciales JSON) | `-----BEGIN PRIVATE KEY-----...` |
| `CORS_ORIGINS` | URLs permitidas para CORS | `http://localhost:4200` |
| `REDIS_URL` | URL de Redis | `redis://localhost:6379` |

## 📚 API Endpoints

### Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Estado de salud de la API |
| `GET` | `/api/docs` | Documentación Swagger |

### Empresas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/empresas` | Listar empresas |
| `POST` | `/api/v1/empresas` | Crear empresa |
| `GET` | `/api/v1/empresas/:id` | Obtener empresa |
| `PUT` | `/api/v1/empresas/:id` | Actualizar empresa |
| `DELETE` | `/api/v1/empresas/:id` | Eliminar empresa |

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Iniciar sesión |
| `POST` | `/api/v1/auth/verify` | Verificar token |
| `GET` | `/api/v1/auth/profile` | Perfil del usuario |

Ver documentación completa en `/api/docs` cuando el servidor esté ejecutándose.

## 🔒 Autenticación

La API utiliza **Firebase Authentication** con tokens JWT:

```typescript
// Headers requeridos para endpoints protegidos
{
  "Authorization": "Bearer <firebase-id-token>"
}
```

### Roles de usuario:
- **admin**: Acceso completo al sistema
- **empresa**: Gestión de su propia empresa
- **usuario**: Solo lectura de empresas públicas

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm run test

# Tests con cobertura
npm run test:cov

# Tests específicos
npm run test empresas.service.spec.ts

# Tests end-to-end
npm run test:e2e
```

## 📈 Monitoreo y Logs

Los logs se estructuran en formato JSON para facilitar el análisis:

```json
{
  "timestamp": "2025-11-06T10:00:00.000Z",
  "level": "info",
  "message": "🚀 GET /api/v1/empresas - 200.123.45.67",
  "context": "LoggingInterceptor",
  "method": "GET",
  "url": "/api/v1/empresas",
  "statusCode": 200,
  "duration": 156
}
```

## 🚀 Despliegue

### Railway
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y desplegar
railway login
railway link
railway up
```

### Google Cloud Run
```bash
# Build de la imagen
docker build -t directorio-concon-api .

# Tag para GCR
docker tag directorio-concon-api gcr.io/directorio-concon/api

# Push a GCR
docker push gcr.io/directorio-concon/api

# Deploy a Cloud Run
gcloud run deploy directorio-concon-api \
  --image gcr.io/directorio-concon/api \
  --platform managed \
  --region us-central1
```

### Variables de entorno en producción
Asegúrate de configurar todas las variables de `.env.example` en tu plataforma de despliegue.

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📧 Soporte

- **Desarrollador**: Agencia Digital
- **Email**: desarrollo@agencia-digital.cl
- **Website**: https://agencia-digital.cl

---

**Versión**: 1.0.0  
**Última actualización**: 2025-11-06