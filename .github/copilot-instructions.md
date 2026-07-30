# Copilot Instructions - Directorio de Empresas de Concón

## 📋 Visión General del Proyecto

**Nombre**: Directorio de Empresas de Concón  
**Descripción**: Plataforma web completa para descubrir y gestionar negocios locales en Concón, Chile. Sistema de directorio empresarial con búsqueda avanzada, mapa interactivo, perfiles de empresas, y panel de administración.

**Versión**: 2.0 (Migración a Firebase + NestJS + Angular)  
**Estado**: En desarrollo - Migración desde React + Supabase

---

## 🎯 Stack Tecnológico

### Frontend
- **Framework**: Angular 17+
- **Lenguaje**: TypeScript 5+
- **Styling**: TailwindCSS + Angular Material (opcional para componentes complejos)
- **Mapas**: Google Maps API + @angular/google-maps
- **State Management**: RxJS + Angular Services
- **Routing**: Angular Router (navegación MPA style)
- **Forms**: Reactive Forms con validaciones

### Backend
- **Framework**: NestJS 10+
- **Lenguaje**: TypeScript 5+
- **Arquitectura**: REST API + Modular Pattern
- **Validación**: class-validator + class-transformer
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest

### Base de Datos y Servicios
- **BaaS**: Firebase
  - **Firestore**: Base de datos NoSQL principal
  - **Authentication**: Sistema de autenticación dual (admin/empresa)
  - **Storage**: Almacenamiento de logos de empresas
  - **Hosting**: Despliegue del frontend Angular
- **Admin SDK**: Firebase Admin en NestJS para operaciones privilegiadas

### Despliegue
- **Frontend**: Firebase Hosting
- **Backend**: Railway / Google Cloud Run
- **CI/CD**: GitHub Actions
- **Monitoring**: Firebase Analytics + Google Cloud Monitoring

---

## 🏗️ Arquitectura del Sistema

### Estructura de Capas

```
┌─────────────────────────────────────────────────────┐
│           FRONTEND (Angular + TailwindCSS)           │
│  - Componentes reutilizables                         │
│  - Páginas (12 rutas principales)                    │
│  - Servicios (API, Auth, Map)                        │
│  - Guards (autenticación/autorización)               │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP REST API
┌──────────────────▼──────────────────────────────────┐
│            BACKEND (NestJS API)                      │
│  - Controllers (endpoints REST)                      │
│  - Services (lógica de negocio)                      │
│  - DTOs (validación de datos)                        │
│  - Guards (autenticación JWT)                        │
│  - Interceptors (logging, errores)                   │
└──────────────────┬──────────────────────────────────┘
                   │ Firebase Admin SDK
┌──────────────────▼──────────────────────────────────┐
│           FIREBASE PLATFORM                          │
│  - Firestore (datos estructurados)                   │
│  - Authentication (usuarios)                         │
│  - Storage (imágenes)                                │
│  - Security Rules (permisos)                         │
└─────────────────────────────────────────────────────┘
```

### Módulos Principales

#### Frontend Angular
```
src/
├── app/
│   ├── core/                    # Servicios singleton, guards, interceptors
│   │   ├── services/
│   │   │   ├── api.service.ts           # Cliente HTTP principal
│   │   │   ├── auth.service.ts          # Autenticación
│   │   │   └── map.service.ts           # Google Maps wrapper
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   ├── shared/                  # Componentes, pipes, directives reutilizables
│   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── footer/
│   │   │   ├── card/
│   │   │   └── glass-card/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/                # Módulos de funcionalidad
│   │   ├── home/
│   │   ├── search/
│   │   ├── map/
│   │   ├── empresa/
│   │   ├── categorias/
│   │   ├── barrios/
│   │   ├── publish/
│   │   ├── admin/
│   │   └── auth/
│   └── models/                  # Interfaces y tipos
│       ├── empresa.model.ts
│       ├── categoria.model.ts
│       └── barrio.model.ts
```

#### Backend NestJS
```
src/
├── modules/
│   ├── empresas/
│   │   ├── empresas.module.ts
│   │   ├── empresas.controller.ts
│   │   ├── empresas.service.ts
│   │   ├── dto/
│   │   │   ├── create-empresa.dto.ts
│   │   │   └── update-empresa.dto.ts
│   │   └── entities/
│   │       └── empresa.entity.ts
│   ├── categorias/
│   ├── barrios/
│   ├── auth/
│   ├── usuarios/
│   └── solicitudes/
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── decorators/
├── config/
│   ├── firebase.config.ts
│   └── app.config.ts
└── main.ts
```

---

## 📊 Modelo de Datos Firestore

### Colecciones Principales

#### 1. `empresas`
```typescript
interface Empresa {
  id: string;                    // ID auto-generado por Firestore
  nombre: string;                // Nombre de la empresa
  slug: string;                  // URL-friendly slug único
  descripcion: string;           // Descripción detallada
  categoriaId: string;           // Referencia a categoría
  barrioId: string;              // Referencia a barrio
  direccion: string;             // Dirección física completa
  telefono?: string;             // Teléfono de contacto
  email?: string;                // Email de contacto
  sitioWeb?: string;             // URL del sitio web
  redesSociales?: {              // Redes sociales
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  horarios?: string;             // Texto libre o JSON estructurado
  servicios?: string[];          // Lista de servicios principales
  coordenadas?: {                // Geolocalización
    lat: number;
    lng: number;
  };
  logoUrl?: string;              // URL en Firebase Storage
  destacado: boolean;            // ¿Empresa destacada en home?
  verificado: boolean;           // ¿Verificada por admin?
  status: 'pendiente' | 'aprobado' | 'rechazado';
  usuarioId: string;             // Usuario propietario
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `categorias`
```typescript
interface Categoria {
  id: string;
  nombre: string;                // "Restaurantes y Gastronomía"
  slug: string;                  // "restaurantes-gastronomia"
  descripcion: string;
  icono: string;                 // Nombre del icono Lucide
  color?: string;                // Color hexadecimal
  orden: number;                 // Para ordenar visualización
  activa: boolean;
  createdAt: Timestamp;
}
```

#### 3. `barrios`
```typescript
interface Barrio {
  id: string;
  nombre: string;                // "Centro"
  slug: string;                  // "centro"
  codigo?: string;               // "A" (UV_01)
  descripcion: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
  tipo: 'urbano' | 'rural';
  createdAt: Timestamp;
}
```

#### 4. `usuarios`
```typescript
interface Usuario {
  id: string;                    // UID de Firebase Auth
  email: string;
  nombre: string;
  rol: 'admin' | 'owner' | 'member';
  placeId?: string;             // Si es dueño de place (solo rol owner)
  telefono?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 5. `solicitudes`
```typescript
interface Solicitud {
  id: string;
  empresaId: string;
  usuarioId: string;
  tipo: 'registro' | 'actualizacion';
  status: 'pendiente' | 'aprobado' | 'rechazado';
  comentarios?: string;
  revisadoPor?: string;
  createdAt: Timestamp;
  revisadoAt?: Timestamp;
}
```

### Índices Firestore Requeridos

```javascript
// empresas
- categoriaId (ASC)
- barrioId (ASC)
- status (ASC) + destacado (DESC) + createdAt (DESC)
- slug (ASC) - único

// categorias
- slug (ASC) - único
- activa (ASC) + orden (ASC)

// barrios
- slug (ASC) - único
- tipo (ASC)

// usuarios
- email (ASC) - único
- rol (ASC)
```

---

## 🎨 Sistema de Diseño

**Estilo**: Modern Minimalism Premium con Identidad Costera Chilena

### Paleta de Colores

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F0FF',
          100: '#CCE0FF',
          500: '#0066FF',  // Azul océano profesional
          600: '#0052CC',
          900: '#003D99',
        },
        secondary: {
          50: '#FFF4F1',
          100: '#FFE8E0',
          500: '#FF6B35',  // Coral gastronómico
          600: '#E85A28',
          900: '#B43D1A',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          500: '#A3A3A3',
          700: '#404040',
          900: '#171717',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '30': '7.5rem',   // 120px
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
    },
  },
}
```

### Componentes de UI

Ver especificaciones completas en `docs/design-specification.md`:
- Botones (primario, secundario, terciario, ghost)
- Cards (estándar, glassmorphic)
- Inputs y formularios
- Navigation bar
- Hero sections
- Grid de categorías
- Mapas embebidos

---

## 🔐 Autenticación y Autorización

### Flujo de Autenticación

1. **Frontend**: Usuario inicia sesión con email/password
2. **Firebase Auth**: Valida credenciales y retorna `idToken`
3. **Frontend**: Envía `idToken` en header `Authorization: Bearer <token>`
4. **Backend**: Verifica `idToken` con Firebase Admin SDK
5. **Backend**: Extrae `uid` y carga datos de usuario desde Firestore
6. **Backend**: Procesa request con contexto de usuario autenticado

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **admin** | - CRUD completo de empresas, categorías, barrios<br>- Aprobar/rechazar solicitudes<br>- Gestionar usuarios<br>- Ver panel de métricas |
| **empresa** | - CRUD de su propia empresa<br>- Ver solicitudes propias<br>- Actualizar perfil |
| **usuario** | - Ver empresas públicas<br>- Buscar y filtrar<br>- Ver mapa |

### Guards Angular

```typescript
// auth.guard.ts
canActivate(): Observable<boolean> {
  return this.authService.isAuthenticated$.pipe(
    tap(isAuth => {
      if (!isAuth) this.router.navigate(['/login']);
    })
  );
}

// role.guard.ts
canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
  const requiredRole = route.data['role'];
  return this.authService.hasRole(requiredRole).pipe(
    tap(hasRole => {
      if (!hasRole) this.router.navigate(['/']);
    })
  );
}
```

### Guards NestJS

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) throw new UnauthorizedException();
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const userDoc = await admin.firestore()
      .collection('usuarios')
      .doc(request.user.uid)
      .get();
    
    const userData = userDoc.data();
    return requiredRoles.includes(userData?.rol);
  }
}
```

---

## 🛠️ Convenciones de Código

### Nomenclatura

#### TypeScript/Angular
- **Clases/Interfaces**: PascalCase - `EmpresaService`, `Empresa`
- **Métodos/Variables**: camelCase - `getEmpresas()`, `empresaId`
- **Constantes**: UPPER_SNAKE_CASE - `MAX_FILE_SIZE`
- **Archivos**: kebab-case - `empresa.service.ts`, `create-empresa.dto.ts`
- **Componentes Angular**: kebab-case + sufijo - `empresa-card.component.ts`

#### Firestore
- **Colecciones**: plural, camelCase - `empresas`, `categorias`
- **Documentos**: IDs auto-generados o slugs kebab-case
- **Campos**: camelCase - `empresaId`, `createdAt`

### Estructura de Commits

Usar Conventional Commits:
```
feat(empresas): agregar endpoint de búsqueda por categoría
fix(auth): corregir validación de token expirado
docs(readme): actualizar instrucciones de instalación
style(ui): ajustar espaciado en cards de empresa
refactor(services): extraer lógica de geolocalización
test(empresas): agregar tests unitarios para service
```

### Comentarios

```typescript
/**
 * Busca empresas por categoría y barrio con paginación.
 * 
 * @param filters - Filtros de búsqueda
 * @param page - Número de página (1-indexed)
 * @param limit - Empresas por página (default: 20)
 * @returns Observable con array de empresas y total
 * 
 * @example
 * searchEmpresas({ categoriaId: 'abc123' }, 1, 10).subscribe(...)
 */
searchEmpresas(filters: SearchFilters, page: number, limit: number = 20): Observable<SearchResult> {
  // Implementación
}
```

### Manejo de Errores

#### Angular
```typescript
// Usar operadores RxJS para manejo centralizado
this.empresasService.getEmpresas().pipe(
  catchError(error => {
    console.error('Error cargando empresas:', error);
    this.notificationService.showError('No se pudieron cargar las empresas');
    return of([]);
  })
).subscribe(empresas => {
  this.empresas = empresas;
});
```

#### NestJS
```typescript
// Usar HttpException específicas
@Get(':id')
async findOne(@Param('id') id: string) {
  const empresa = await this.empresasService.findOne(id);
  if (!empresa) {
    throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
  }
  return empresa;
}

// Global exception filter para errores Firestore
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Transformar errores de Firestore a HTTP responses
  }
}
```

---

## 📖 Patrones de Desarrollo

### Patrón de Servicios (Angular)

```typescript
@Injectable({
  providedIn: 'root'
})
export class EmpresasService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  getEmpresas(filters?: SearchFilters): Observable<Empresa[]> {
    const params = this.buildParams(filters);
    return this.http.get<Empresa[]>(`${this.apiUrl}/empresas`, { params }).pipe(
      map(empresas => empresas.map(e => this.transformEmpresa(e))),
      shareReplay(1) // Cache para múltiples suscriptores
    );
  }
  
  private transformEmpresa(raw: any): Empresa {
    // Transformación de datos
    return {
      ...raw,
      createdAt: raw.createdAt.toDate() // Timestamp to Date
    };
  }
}
```

### Patrón de Módulos (NestJS)

```typescript
@Module({
  imports: [
    // Otros módulos necesarios
  ],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService] // Si otros módulos lo necesitan
})
export class EmpresasModule {}
```

### DTOs con Validación

```typescript
export class CreateEmpresaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nombre: string;
  
  @IsString()
  @IsOptional()
  descripcion?: string;
  
  @IsString()
  @IsNotEmpty()
  categoriaId: string;
  
  @IsString()
  @IsNotEmpty()
  barrioId: string;
  
  @IsEmail()
  @IsOptional()
  email?: string;
  
  @ValidateNested()
  @Type(() => CoordenadasDto)
  @IsOptional()
  coordenadas?: CoordenadasDto;
}
```

### Componentes Smart/Dumb (Angular)

```typescript
// Smart Component (container)
@Component({
  selector: 'app-empresas-list',
  template: `
    <app-empresa-card 
      *ngFor="let empresa of empresas$ | async"
      [empresa]="empresa"
      (viewDetails)="onViewDetails($event)">
    </app-empresa-card>
  `
})
export class EmpresasListComponent {
  empresas$ = this.empresasService.getEmpresas();
  
  constructor(private empresasService: EmpresasService) {}
  
  onViewDetails(empresaId: string): void {
    this.router.navigate(['/empresa', empresaId]);
  }
}

// Dumb Component (presentational)
@Component({
  selector: 'app-empresa-card',
  template: `...`
})
export class EmpresaCardComponent {
  @Input() empresa!: Empresa;
  @Output() viewDetails = new EventEmitter<string>();
  
  onViewClick(): void {
    this.viewDetails.emit(this.empresa.id);
  }
}
```

---

## 🚀 Flujos de Trabajo Clave

### 1. Publicar Nueva Empresa

**Frontend (Angular)**:
1. Usuario completa formulario multi-step en `/publicar`
2. Validación de campos con Reactive Forms
3. Upload de logo a Firebase Storage
4. POST a `/api/empresas` con datos + logoUrl

**Backend (NestJS)**:
1. Validación de DTO con `class-validator`
2. Verificación de slug único en Firestore
3. Creación de documento en colección `empresas` (status: 'pendiente')
4. Creación de documento en colección `solicitudes`
5. Retornar empresa creada

**Base de Datos**:
1. Documento creado en `/empresas/{id}`
2. Documento creado en `/solicitudes/{id}`
3. Trigger para notificar admin (opcional)

### 2. Búsqueda de Empresas

**Frontend (Angular)**:
1. Usuario ingresa filtros en `/buscar`
2. Componente llama a `empresasService.searchEmpresas(filters)`
3. Actualización de vista con resultados + mapa

**Backend (NestJS)**:
1. GET `/api/empresas?categoria=X&barrio=Y&q=texto`
2. Construcción de query Firestore compuesta
3. Aplicación de filtros y paginación
4. Retornar array de empresas + metadata

**Firestore Query**:
```typescript
let query = admin.firestore().collection('empresas')
  .where('status', '==', 'aprobado');

if (categoriaId) {
  query = query.where('categoriaId', '==', categoriaId);
}

if (barrioId) {
  query = query.where('barrioId', '==', barrioId);
}

// Para búsqueda por texto, usar búsqueda en memoria o Algolia
const snapshot = await query.get();
```

### 3. Mapa Interactivo

**Frontend (Angular)**:
1. Componente MapaComponent carga Google Maps
2. Obtiene empresas con coordenadas válidas
3. Renderiza marcadores con colores por categoría
4. Implementa clustering con MarkerClusterer
5. Muestra InfoWindow al hacer click

**Backend (NestJS)**:
1. GET `/api/empresas/mapData`
2. Filtrar empresas con `coordenadas != null`
3. Incluir datos mínimos (id, nombre, categoría, coordenadas)
4. Retornar array optimizado

---

## 🧪 Testing

### Frontend (Angular + Jest)

```typescript
describe('EmpresasService', () => {
  let service: EmpresasService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmpresasService]
    });
    
    service = TestBed.inject(EmpresasService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch empresas from API', () => {
    const mockEmpresas = [{ id: '1', nombre: 'Test' }];
    
    service.getEmpresas().subscribe(empresas => {
      expect(empresas.length).toBe(1);
      expect(empresas[0].nombre).toBe('Test');
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/empresas`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEmpresas);
  });
});
```

### Backend (NestJS + Jest)

```typescript
describe('EmpresasService', () => {
  let service: EmpresasService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmpresasService],
    }).compile();
    
    service = module.get<EmpresasService>(EmpresasService);
  });
  
  it('should create a empresa', async () => {
    const createDto: CreateEmpresaDto = {
      nombre: 'Test Empresa',
      categoriaId: 'cat1',
      barrioId: 'bar1',
    };
    
    const result = await service.create(createDto);
    expect(result.id).toBeDefined();
    expect(result.nombre).toBe('Test Empresa');
  });
});
```

---

## 🌍 Variables de Entorno

### Frontend (Angular)

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'directorio-concon.firebaseapp.com',
    projectId: 'directorio-concon',
    storageBucket: 'directorio-concon.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_KEY',
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.directorio-concon.com/api',
  // ... resto de config
};
```

### Backend (NestJS)

```bash
# .env
NODE_ENV=development
PORT=3000

# Firebase
FIREBASE_PROJECT_ID=directorio-concon
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@directorio-concon.iam.gserviceaccount.com

# CORS
CORS_ORIGIN=http://localhost:4200

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

## 📚 Recursos y Documentación

### Documentación Oficial
- [Angular Documentation](https://angular.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Documentos del Proyecto
- `docs/design-specification.md` - Sistema de diseño completo
- `docs/content-structure-plan.md` - Estructura de contenido
- `.github/instructions/frontend-instructions.md` - Guía específica frontend Angular
- `.github/instructions/backend-instructions.md` - Guía específica backend NestJS
- `.github/instructions/database-instructions.md` - Estructura Firestore y reglas
- `.github/instructions/deployment-instructions.md` - Instrucciones de despliegue
- `.github/instructions/ai-instructions.md` - **NUEVO**: Incorporación de Inteligencia Artificial

### APIs Externas
- Google Maps JavaScript API
- Google Maps Geocoding API (opcional)
- Firebase Admin SDK

---

## ⚠️ Restricciones y Limitaciones

### Firestore
- **Queries compuestas**: Requieren índices compuestos creados manualmente
- **Full-text search**: No nativo, considerar Algolia o búsqueda en memoria
- **Límites de lectura**: 50,000 lecturas/día en plan gratuito
- **Transacciones**: Max 500 operaciones por transacción

### Firebase Storage
- **Tamaño de archivo**: Max 10MB para logos (configurar en reglas)
- **Nombres únicos**: Usar UUID + timestamp para evitar colisiones

### Google Maps API
- **Límites de uso**: Verificar plan gratuito vs pagado
- **API Key**: Restringir por dominio en producción

---

## 🎯 Próximos Pasos (Roadmap)

### Fase 1: Setup Inicial (Sprint 1-2)
- [ ] Configurar proyecto Angular con routing y módulos
- [ ] Configurar proyecto NestJS con módulos base
- [ ] Setup Firebase (Firestore, Auth, Storage)
- [ ] Implementar autenticación Firebase en ambos lados
- [ ] Sistema de diseño base (Tailwind + componentes)

### Fase 2: Funcionalidades Core (Sprint 3-5)
- [ ] CRUD de empresas (backend + frontend)
- [ ] Sistema de búsqueda y filtros
- [ ] Páginas de categorías y barrios
- [ ] Perfil de empresa con mapa individual
- [ ] Panel de administración básico

### Fase 3: Funcionalidades Avanzadas (Sprint 6-8)
- [ ] Mapa interactivo con clustering
- [ ] Sistema de solicitudes y aprobaciones
- [ ] Panel de empresa con gestión
- [ ] Formulario multi-step de publicación
- [ ] Upload de imágenes a Storage

### Fase 4: Optimización y Despliegue (Sprint 9-10)
- [ ] Testing completo (unitarios + e2e)
- [ ] Optimización de performance
- [ ] SEO y meta tags
- [ ] CI/CD con GitHub Actions
- [ ] Despliegue a producción

### **Fase 5: Inteligencia Artificial (Sprint 11-17) 🤖**
- [ ] **Setup de IA**: OpenAI/Anthropic + Pinecone + Redis
- [ ] **Chatbot Inteligente**: Asistente virtual de búsqueda
- [ ] **Recomendaciones**: Sistema de recomendaciones personalizadas
- [ ] **Búsqueda Semántica**: Búsqueda que entiende intención
- [ ] **Análisis de Sentimientos**: Procesamiento automático de reseñas
- [ ] **Insights para Empresas**: Analytics inteligentes y predicciones
- [ ] **Optimización**: Monitoreo, costos y mejora continua

> 📋 **Ver detalles completos en**: `.github/instructions/ai-instructions.md`

---

## 💡 Tips para Copilot

### Al generar código Angular:
- Usar standalone components cuando sea posible (Angular 17+)
- Implementar lazy loading para rutas
- Usar `OnPush` change detection strategy
- Implementar RxJS best practices (evitar nested subscribe)
- Usar `async` pipe en templates

### Al generar código NestJS:
- Seguir arquitectura modular estricta
- Usar DTOs para todas las operaciones
- Implementar guards y interceptors globales
- Usar decoradores custom cuando sea apropiado
- Documentar endpoints con Swagger decorators

### Al trabajar con Firestore:
- Siempre verificar existencia de documentos antes de acceder
- Usar transacciones para operaciones atómicas
- Implementar paginación con cursors, no offset
- Denormalizar datos estratégicamente para performance
- Crear índices compuestos ANTES de deployar queries

### Al implementar UI:
- Seguir design tokens de `design-specification.md`
- Mantener espaciado generoso (64-96px entre secciones)
- Usar colores sólidos, evitar gradientes (excepto hero overlay)
- Implementar animaciones sutiles (200-300ms)
- Garantizar contraste ≥4.5:1 (WCAG AA)

### **Al implementar funcionalidades de IA: 🤖**
- **Priorizar UX**: La IA debe ser invisible y útil, no obvia
- **Cache agresivo**: Usar Redis para respuestas frecuentes del chatbot
- **Rate limiting**: Implementar límites para controlar costos de APIs
- **Fallbacks**: Siempre tener alternativas si APIs de IA fallan
- **Transparencia**: Explicar claramente cuando se usa IA
- **Privacidad**: No enviar datos sensibles a APIs externas
- **Monitoreo**: Trackear costos y performance constantemente
- **Iteración**: Mejorar prompts y algoritmos basándose en feedback

---

**Versión**: 1.0  
**Última actualización**: 2025-11-06  
**Mantenido por**: Equipo de Desarrollo Directorio Concón
