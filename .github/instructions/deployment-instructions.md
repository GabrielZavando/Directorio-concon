# Deployment Instructions - Directorio Concón

## 📋 Resumen

Instrucciones completas para el despliegue del Directorio de Empresas de Concón con **Firebase Hosting** (frontend Angular) y **Railway/Cloud Run** (backend NestJS).

---

## 🎯 Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────┐
│          USUARIOS / CLIENTES                     │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│          Firebase Hosting                        │
│     (Frontend Angular - SPA)                     │
│     URL: directorio-concon.web.app              │
└────────────────┬────────────────────────────────┘
                 │ API Calls (HTTPS)
┌────────────────▼────────────────────────────────┐
│     Railway / Google Cloud Run                   │
│     (Backend NestJS - API REST)                  │
│     URL: api.directorio-concon.com              │
└────────────────┬────────────────────────────────┘
                 │ Firebase Admin SDK
┌────────────────▼────────────────────────────────┐
│          Firebase Services                       │
│  - Firestore (Database)                          │
│  - Authentication                                │
│  - Storage (Imágenes)                            │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Opción 1: Despliegue con Railway (Recomendado)

### Backend NestJS en Railway

#### 1. Preparar Proyecto

**package.json** - Agregar scripts:
```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "prestart:prod": "npm run build"
  }
}
```

**Procfile** (opcional):
```
web: npm run start:prod
```

**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 2. Deploy a Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Vincular con repo de GitHub (recomendado)
railway link

# Configurar variables de entorno
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set FIREBASE_PROJECT_ID=directorio-concon
railway variables set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
railway variables set FIREBASE_CLIENT_EMAIL=firebase-adminsdk@directorio-concon.iam.gserviceaccount.com
railway variables set CORS_ORIGIN=https://directorio-concon.web.app

# Deploy
railway up

# Obtener URL generada
railway domain
```

#### 3. Configurar Dominio Personalizado (Opcional)

1. En Railway Dashboard, ir a "Settings" > "Domains"
2. Agregar dominio: `api.directorio-concon.com`
3. Configurar DNS con CNAME:
   ```
   api.directorio-concon.com  CNAME  your-app.up.railway.app
   ```

### Monitoreo Railway

```bash
# Ver logs en tiempo real
railway logs

# Ver status
railway status

# Rollback a versión anterior
railway rollback
```

---

## 🌩️ Opción 2: Despliegue con Google Cloud Run

### Backend NestJS en Cloud Run

#### 1. Crear Dockerfile

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/main"]
```

**.dockerignore**:
```
node_modules
dist
.git
.env
*.md
```

#### 2. Build y Push a Container Registry

```bash
# Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Configurar proyecto
gcloud config set project directorio-concon

# Build imagen
gcloud builds submit --tag gcr.io/directorio-concon/backend

# O con Docker local
docker build -t gcr.io/directorio-concon/backend .
docker push gcr.io/directorio-concon/backend
```

#### 3. Deploy a Cloud Run

```bash
gcloud run deploy directorio-concon-backend \
  --image gcr.io/directorio-concon/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-env-vars FIREBASE_PROJECT_ID=directorio-concon \
  --set-env-vars FIREBASE_CLIENT_EMAIL=firebase-adminsdk@directorio-concon.iam.gserviceaccount.com \
  --set-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

#### 4. Configurar Dominio Personalizado

```bash
gcloud run domain-mappings create \
  --service directorio-concon-backend \
  --domain api.directorio-concon.com \
  --region us-central1
```

---

## 🔥 Frontend Angular en Firebase Hosting

### 1. Preparar Build de Producción

**angular.json** - Configurar optimizaciones:
```json
{
  "projects": {
    "directorio-concon-frontend": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "aot": true,
              "extractLicenses": true,
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### 2. Build

```bash
cd directorio-concon-frontend

# Build para producción
ng build --configuration production

# Archivos generados en dist/directorio-concon-frontend/browser/
```

### 3. Configurar Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar Hosting
firebase init hosting

# Responder preguntas:
# ? What do you want to use as your public directory? dist/directorio-concon-frontend/browser
# ? Configure as a single-page app (rewrite all urls to /index.html)? Yes
# ? Set up automatic builds and deploys with GitHub? Yes (opcional)
```

**firebase.json**:
```json
{
  "hosting": {
    "public": "dist/directorio-concon-frontend/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 4. Deploy

```bash
# Deploy a Firebase Hosting
firebase deploy --only hosting

# URL generada: https://directorio-concon.web.app
# También: https://directorio-concon.firebaseapp.com
```

### 5. Configurar Dominio Personalizado

1. En Firebase Console, ir a "Hosting"
2. Click en "Agregar dominio personalizado"
3. Ingresar: `www.directorio-concon.com`
4. Seguir instrucciones para configurar DNS:

```
www.directorio-concon.com  A  151.101.1.195
www.directorio-concon.com  A  151.101.65.195
directorio-concon.com      A  151.101.1.195
directorio-concon.com      A  151.101.65.195
```

---

## 🔄 CI/CD con GitHub Actions

### Workflow para Backend (Railway)

**.github/workflows/deploy-backend.yml**:
```yaml
name: Deploy Backend to Railway

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run tests
        working-directory: ./backend
        run: npm run test
      
      - name: Build
        working-directory: ./backend
        run: npm run build
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: directorio-concon-backend
```

### Workflow para Frontend (Firebase Hosting)

**.github/workflows/deploy-frontend.yml**:
```yaml
name: Deploy Frontend to Firebase

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        run: npm run build -- --configuration production
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: directorio-concon
```

### Configurar Secrets en GitHub

1. Ir a repo > Settings > Secrets and variables > Actions
2. Agregar secrets:
   - `RAILWAY_TOKEN`: Token de Railway
   - `FIREBASE_SERVICE_ACCOUNT`: JSON de service account

---

## 🔒 Variables de Entorno

### Backend (Railway/Cloud Run)

```bash
NODE_ENV=production
PORT=3000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=directorio-concon
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@directorio-concon.iam.gserviceaccount.com

# CORS
CORS_ORIGIN=https://directorio-concon.web.app,https://www.directorio-concon.com

# Rate Limiting (opcional)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Frontend (Angular - Build Time)

**src/environments/environment.prod.ts**:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.directorio-concon.com/api',
  firebase: {
    apiKey: 'AIzaSy...',
    authDomain: 'directorio-concon.firebaseapp.com',
    projectId: 'directorio-concon',
    storageBucket: 'directorio-concon.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123',
  },
  googleMapsApiKey: 'AIzaSy...',
};
```

---

## 📊 Monitoreo y Logging

### Backend

#### Railway
```bash
# Ver logs en tiempo real
railway logs --tail

# Ver métricas
railway metrics
```

#### Google Cloud Run
```bash
# Ver logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=directorio-concon-backend" --limit 50

# Métricas en Cloud Console
# https://console.cloud.google.com/run
```

### Frontend (Firebase Hosting)

1. Firebase Console > Hosting > Ver uso
2. Métricas disponibles:
   - Solicitudes totales
   - Ancho de banda
   - Errores 4xx/5xx

### Firebase Performance Monitoring (Opcional)

**app.module.ts**:
```typescript
import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';

const app = initializeApp(environment.firebase);
const perf = getPerformance(app);
```

---

## 🔧 Troubleshooting

### Error: CORS en producción

**Backend - main.ts**:
```typescript
app.enableCors({
  origin: [
    'https://directorio-concon.web.app',
    'https://directorio-concon.firebaseapp.com',
    'https://www.directorio-concon.com',
  ],
  credentials: true,
});
```

### Error: Environment variables no cargadas

**Railway**:
```bash
# Verificar variables
railway variables

# Reiniciar servicio
railway restart
```

**Cloud Run**:
```bash
# Ver configuración actual
gcloud run services describe directorio-concon-backend --region us-central1

# Actualizar variables
gcloud run services update directorio-concon-backend \
  --region us-central1 \
  --update-env-vars KEY=VALUE
```

### Error: Build falla en Firebase Hosting

```bash
# Limpiar caché
rm -rf dist/ node_modules/
npm install
ng build --configuration production

# Verificar tamaño de archivos
ls -lh dist/directorio-concon-frontend/browser/
```

### Error: Firebase Admin SDK authentication

- Verificar que `FIREBASE_PRIVATE_KEY` tiene saltos de línea correctos: `\n`
- En Railway/Cloud Run, usar Secrets para datos sensibles

---

## 📋 Checklist de Despliegue

### Pre-despliegue
- [ ] Tests unitarios pasando (backend y frontend)
- [ ] Build de producción exitoso
- [ ] Variables de entorno configuradas
- [ ] Reglas de seguridad Firebase actualizadas
- [ ] Índices Firestore creados

### Backend
- [ ] Deploy a Railway/Cloud Run exitoso
- [ ] Health check endpoint funcionando
- [ ] CORS configurado correctamente
- [ ] Logs sin errores críticos
- [ ] Documentación Swagger accesible

### Frontend
- [ ] Deploy a Firebase Hosting exitoso
- [ ] URLs de API correctas en environment.prod.ts
- [ ] Dominio personalizado configurado (si aplica)
- [ ] SSL/HTTPS funcionando
- [ ] PWA configurado (opcional)

### Post-despliegue
- [ ] Testing manual de flujos críticos
- [ ] Verificar autenticación
- [ ] Verificar carga de empresas
- [ ] Verificar mapa interactivo
- [ ] Verificar búsqueda y filtros
- [ ] Monitoreo activo configurado

---

## 🎯 Estrategias de Despliegue

### Blue-Green Deployment

**Firebase Hosting** (con múltiples sitios):
```bash
# Crear sitio staging
firebase hosting:sites:create directorio-concon-staging

# Deploy a staging
firebase deploy --only hosting:directorio-concon-staging

# Probar: https://directorio-concon-staging.web.app

# Si todo OK, deploy a producción
firebase deploy --only hosting:directorio-concon
```

### Rollback

**Railway**:
```bash
# Ver historial de deploys
railway history

# Rollback a versión anterior
railway rollback <deployment-id>
```

**Firebase Hosting**:
```bash
# Ver versiones anteriores
firebase hosting:releases:list

# Rollback a versión específica
firebase hosting:rollback
```

---

## 📈 Optimizaciones

### Performance

**Frontend**:
- Lazy loading de módulos
- Image optimization (WebP)
- Service Worker (PWA)
- CDN de Firebase Hosting

**Backend**:
- Caché de respuestas con Redis (opcional)
- Rate limiting
- Compresión gzip
- Connection pooling

### Costos

**Firebase**:
- Plan Spark (gratis): 50k lecturas/día, 20k escrituras/día
- Plan Blaze (pay-as-you-go): Escala automático

**Railway**:
- Plan Developer: $5/mes + uso
- Plan Pro: $20/mes + uso

**Cloud Run**:
- Primeros 2 millones de requests gratis/mes
- $0.40 por millón de requests después

---

## 🆘 Soporte

### Logs y Debugging

```bash
# Railway
railway logs --tail

# Cloud Run
gcloud run services logs read directorio-concon-backend --region us-central1

# Firebase Hosting
firebase hosting:channel:list
```

### Contactos

- Firebase Support: https://firebase.google.com/support
- Railway Support: https://railway.app/help
- Google Cloud Support: https://cloud.google.com/support

---

**Versión**: 1.0  
**Última actualización**: 2025-11-06  
**Próxima revisión**: Al completar primera fase de desarrollo
