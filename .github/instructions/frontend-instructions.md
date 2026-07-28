# Frontend Instructions - Angular para Directorio Concón

## 📋 Resumen

Instrucciones detalladas para el desarrollo del frontend del Directorio de Places de Concón usando **Angular 17+**, **TailwindCSS** y **Google Maps**.

---

## 🚀 Setup Inicial

### 1. Crear Proyecto Angular

```bash
# Instalar Angular CLI
npm install -g @angular/cli

# Crear nuevo proyecto
ng new directorio-concon-frontend
# ? Would you like to add Angular routing? Yes
# ? Which stylesheet format would you like to use? CSS

cd directorio-concon-frontend

# Instalar dependencias adicionales
npm install @angular/google-maps
npm install firebase
npm install rxjs
npm install lucide-angular
```

### 2. Configurar TailwindCSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F0FF',
          100: '#CCE0FF',
          500: '#0066FF',
          600: '#0052CC',
          900: '#003D99',
        },
        secondary: {
          50: '#FFF4F1',
          100: '#FFE8E0',
          500: '#FF6B35',
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
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}
```

**src/styles.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
  background-color: #FAFAFA;
}

/* Clases personalizadas */
@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5;
  }
  
  .btn-secondary {
    @apply px-6 py-3 bg-secondary-500 text-white font-semibold rounded-lg hover:bg-secondary-600 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5;
  }
  
  .card-glass {
    @apply bg-white/40 backdrop-blur-md border border-white/50 rounded-xl shadow-lg;
  }
  
  .input-field {
    @apply w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all;
  }
}
```

### 3. Estructura de Carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── places.service.ts
│   │   │   ├── categorias.service.ts
│   │   │   └── barrios.service.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   └── error.interceptor.ts
│   │   └── models/
│   │       ├── place.model.ts
│   │       ├── categoria.model.ts
│   │       ├── barrio.model.ts
│   │       └── usuario.model.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── footer/
│   │   │   ├── card/
│   │   │   └── loading/
│   │   └── pipes/
│   │       └── safe-url.pipe.ts
│   ├── features/
│   │   ├── home/
│   │   │   ├── home.component.ts
│   │   │   ├── home.component.html
│   │   │   └── home.component.css
│   │   ├── search/
│   │   ├── map/
│   │   ├── place-detail/
│   │   ├── categorias/
│   │   ├── barrios/
│   │   ├── publish/
│   │   ├── admin/
│   │   └── auth/
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles.css
```

---

## 🏗️ Configuración Base

### Environments

**environments/environment.ts**:
```typescript
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
```

### App Config

**app.config.ts**:
```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GoogleMapsModule } from '@angular/google-maps';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    importProvidersFrom(GoogleMapsModule),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
  ],
};
```

### Routing

**app.routes.ts**:
```typescript
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'buscar',
    loadComponent: () =>
      import('./features/search/search.component').then(
        (m) => m.SearchComponent
      ),
  },
  {
    path: 'mapa',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'place/:slug',
    loadComponent: () =>
      import('./features/place-detail/place-detail.component').then(
        (m) => m.PlaceDetailComponent
      ),
  },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./features/categorias/categorias.component').then(
        (m) => m.CategoriasComponent
      ),
  },
  {
    path: 'barrios',
    loadComponent: () =>
      import('./features/barrios/barrios.component').then(
        (m) => m.BarriosComponent
      ),
  },
  {
    path: 'publicar',
    loadComponent: () =>
      import('./features/publish/publish.component').then(
        (m) => m.PublishComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'admin' },
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
```

---

## 🔐 Servicios Core

### API Service (Base)

**core/services/api.service.ts**:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { params: httpParams });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body);
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`);
  }
}
```

### Auth Service

**core/services/auth.service.ts**:
```typescript
import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user,
  User,
} from '@angular/fire/auth';
import { Observable, from, of, BehaviorSubject, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'empresa' | 'usuario';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private apiService = inject(ApiService);
  
  user$ = user(this.auth);
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Cargar datos de usuario cuando cambie el estado de autenticación
    this.user$.pipe(
      switchMap((firebaseUser) => {
        if (firebaseUser) {
          return this.loadUserData(firebaseUser.uid);
        }
        return of(null);
      })
    ).subscribe((userData) => {
      this.currentUserSubject.next(userData);
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, nombre: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      
      // Crear documento de usuario en Firestore vía API
      await this.apiService
        .post('usuarios', {
          id: userCredential.user.uid,
          email,
          nombre,
          rol: 'usuario',
        })
        .toPromise();
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(map((user) => !!user));
  }

  hasRole(role: string): Observable<boolean> {
    return this.currentUser$.pipe(
      map((user) => user?.rol === role)
    );
  }

  private loadUserData(uid: string): Observable<Usuario | null> {
    return this.apiService.get<Usuario>(`usuarios/${uid}`).pipe(
      catchError(() => of(null))
    );
  }
}
```

### Places Service

**core/services/places.service.ts**:
```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Place, SearchFilters, PaginatedResponse } from '../models/place.model';

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private apiService = inject(ApiService);

  getPlaces(page: number = 1, limit: number = 20): Observable<PaginatedResponse<Place>> {
    return this.apiService.get<PaginatedResponse<Place>>('places', { page, limit }).pipe(
      shareReplay(1)
    );
  }

  getPlace(id: string): Observable<Place> {
    return this.apiService.get<Place>(`places/${id}`);
  }

  getPlaceBySlug(slug: string): Observable<Place> {
    return this.apiService.get<Place>(`places/slug/${slug}`);
  }

  searchPlaces(filters: SearchFilters): Observable<PaginatedResponse<Place>> {
    return this.apiService.get<PaginatedResponse<Place>>('places/search', filters);
  }

  getMapData(): Observable<Place[]> {
    return this.apiService.get<Place[]>('places/map-data');
  }

  createPlace(place: Partial<Place>): Observable<Place> {
    return this.apiService.post<Place>('places', place);
  }

  updatePlace(id: string, place: Partial<Place>): Observable<Place> {
    return this.apiService.put<Place>(`places/${id}`, place);
  }

  deletePlace(id: string): Observable<void> {
    return this.apiService.delete<void>(`places/${id}`);
  }
}
```

---

## 🛡️ Guards e Interceptors

### Auth Guard

**core/guards/auth.guard.ts**:
```typescript
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const AuthGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};
```

### Role Guard

**core/guards/role.guard.ts**:
```typescript
import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const RoleGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data['role'];

  return authService.hasRole(requiredRole).pipe(
    map((hasRole) => {
      if (!hasRole) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
```

### Auth Interceptor

**core/interceptors/auth.interceptor.ts**:
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { switchMap, take } from 'rxjs/operators';
import { from } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return from(authService.getIdToken()).pipe(
    take(1),
    switchMap((token) => {
      if (token) {
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next(clonedReq);
      }
      return next(req);
    })
  );
};
```

### Error Interceptor

**core/interceptors/error.interceptor.ts**:
```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocurrió un error desconocido';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
      }

      console.error('HTTP Error:', errorMessage);
      
      // Aquí puedes mostrar un toast/notification
      // this.notificationService.showError(errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};
```

---

## 🧩 Componentes Principales

### Home Component

**features/home/home.component.ts**:
```typescript
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlacesService } from '../../core/services/places.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { Place } from '../../core/models/place.model';
import { Categoria } from '../../core/models/categoria.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private placesService = inject(PlacesService);
  private categoriasService = inject(CategoriasService);

  searchQuery = '';
  categorias: Categoria[] = [];
  placesDestacados: Place[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.categoriasService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias.slice(0, 8);
      },
      error: (error) => console.error('Error loading categorias:', error),
    });

    this.placesService
      .searchPlaces({ destacado: true, limit: 6 })
      .subscribe({
        next: (response) => {
          this.placesDestacados = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading places:', error);
          this.loading = false;
        },
      });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(this.searchQuery)}`;
    }
  }
}
```

**features/home/home.component.html**:
```html
<div class="min-h-screen bg-neutral-50">
  <!-- Hero Section -->
  <section class="relative pt-32 pb-24 px-4 overflow-hidden min-h-[600px]">
    <!-- Background Images Collage -->
    <div class="absolute inset-0">
      <div class="grid grid-cols-3 h-full">
        <div class="bg-cover bg-center" style="background-image: url('/assets/images/hero/playas-concon.png')"></div>
        <div class="bg-cover bg-center" style="background-image: url('/assets/images/hero/gastronomia-concon.png')"></div>
        <div class="bg-cover bg-center" style="background-image: url('/assets/images/hero/arquitectura-concon.png')"></div>
      </div>
    </div>
    
    <!-- Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary-500/90 via-primary-600/85 to-purple-600/90"></div>
    
    <!-- Content -->
    <div class="container mx-auto max-w-4xl relative z-10">
      <div class="text-center mb-12">
        <h1 class="font-display text-5xl md:text-6xl text-white mb-6 font-bold leading-tight drop-shadow-lg">
          Descubre Concón
        </h1>
        <p class="text-xl md:text-2xl text-white/95 mb-10 max-w-2xl mx-auto font-medium drop-shadow-md">
          La capital gastronómica y costera de Chile. 150+ places verificadas
        </p>

        <!-- Search Bar -->
        <form (ngSubmit)="onSearch()" class="max-w-2xl mx-auto">
          <div class="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg p-2 flex items-center gap-2">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="search"
              placeholder="¿Qué buscas? Restaurantes, servicios, tiendas..."
              class="flex-1 px-4 py-4 text-lg bg-transparent text-white placeholder-white/70 border-none focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              class="px-8 py-4 bg-secondary-500 text-white font-semibold rounded-lg hover:bg-secondary-600 transition-colors shadow-lg"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>

  <!-- Metrics -->
  <section class="py-16 px-4 -mt-8">
    <div class="container mx-auto max-w-6xl">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="card-glass p-8 text-center">
          <div class="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-2">14</div>
          <div class="text-sm text-neutral-600 font-medium">Categorías</div>
        </div>
        <div class="card-glass p-8 text-center">
          <div class="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-2">150+</div>
          <div class="text-sm text-neutral-600 font-medium">Negocios</div>
        </div>
        <div class="card-glass p-8 text-center">
          <div class="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-2">30+</div>
          <div class="text-sm text-neutral-600 font-medium">Verificadas</div>
        </div>
        <div class="card-glass p-8 text-center">
          <div class="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-2">15</div>
          <div class="text-sm text-neutral-600 font-medium">Barrios</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="py-20 px-4 bg-gradient-to-b from-neutral-50 to-white">
    <div class="container mx-auto max-w-6xl">
      <div class="text-center mb-12">
        <h2 class="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-4">
          Explora por Categorías
        </h2>
        <p class="text-lg text-neutral-600 max-w-2xl mx-auto">
          Encuentra los mejores negocios organizados por tipo de servicio
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-6" *ngIf="!loading">
        <a
          *ngFor="let categoria of categorias"
          [routerLink]="['/buscar']"
          [queryParams]="{ categoria: categoria.slug }"
          class="group"
        >
          <div class="relative overflow-hidden rounded-lg h-48">
            <div
              class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
              [style.background-image]="'url(/assets/images/categorias/' + categoria.slug + '.png)'"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/40 to-transparent"></div>
            <div class="relative h-full p-6 flex flex-col justify-end">
              <h3 class="text-lg font-semibold text-white mb-1 drop-shadow-md">
                {{ categoria.nombre }}
              </h3>
              <p class="text-sm text-white/90 drop-shadow">Ver places</p>
            </div>
          </div>
        </a>
      </div>

      <div class="text-center mt-10">
        <a
          routerLink="/categorias"
          class="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold text-lg"
        >
          <span>Ver todas las categorías</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
  </section>
</div>
```

---

## 📱 Componentes Shared

### Navigation Component

**shared/components/navigation/navigation.component.ts**:
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center space-x-2">
            <span class="text-2xl font-bold text-primary-600">Concón</span>
          </a>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-6">
            <a routerLink="/" routerLinkActive="text-primary-600" [routerLinkActiveOptions]="{exact: true}"
               class="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              Inicio
            </a>
            <a routerLink="/categorias" routerLinkActive="text-primary-600"
               class="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              Categorías
            </a>
            <a routerLink="/barrios" routerLinkActive="text-primary-600"
               class="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              Barrios
            </a>
            <a routerLink="/mapa" routerLinkActive="text-primary-600"
               class="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              Mapa
            </a>
          </div>

          <!-- CTA -->
          <div class="flex items-center space-x-4">
            <ng-container *ngIf="authService.user$ | async; else loginButton">
              <button (click)="logout()" class="text-neutral-700 hover:text-primary-600">
                Salir
              </button>
            </ng-container>
            <ng-template #loginButton>
              <a routerLink="/login" class="text-neutral-700 hover:text-primary-600">
                Ingresar
              </a>
            </ng-template>
            <a routerLink="/publicar" class="btn-secondary">
              Publicar Place
            </a>
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class NavigationComponent {
  authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
```

---

## 🗺️ Google Maps Integration

**features/map/map.component.ts**:
```typescript
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, MapInfoWindow, MapMarker, GoogleMapsModule } from '@angular/google-maps';
import { PlacesService } from '../../core/services/places.service';
import { Place } from '../../core/models/place.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  template: `
    <div class="h-screen">
      <google-map
        [center]="center"
        [zoom]="zoom"
        [options]="mapOptions"
        width="100%"
        height="100%"
      >
        <map-marker
          *ngFor="let place of places"
          [position]="{ lat: place.coordenadas.lat, lng: place.coordenadas.lng }"
          [options]="{ title: place.nombre }"
          (mapClick)="openInfoWindow(marker, place)"
          #marker="mapMarker"
        ></map-marker>

        <map-info-window>
          <div *ngIf="selectedPlace" class="p-2">
            <h3 class="font-semibold">{{ selectedPlace.nombre }}</h3>
            <p class="text-sm text-gray-600">{{ selectedPlace.direccion }}</p>
            <a [href]="'/place/' + selectedPlace.slug" class="text-primary-600 text-sm">
              Ver detalles
            </a>
          </div>
        </map-info-window>
      </google-map>
    </div>
  `,
})
export class MapComponent implements OnInit {
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;
  
  private placesService = inject(PlacesService);

  center: google.maps.LatLngLiteral = { lat: -32.9167, lng: -71.5167 };
  zoom = 13;
  mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 18,
    minZoom: 10,
  };

  places: Place[] = [];
  selectedPlace: Place | null = null;

  ngOnInit(): void {
    this.loadMapData();
  }

  loadMapData(): void {
    this.placesService.getMapData().subscribe({
      next: (places) => {
        this.places = places.filter(e => e.coordenadas);
      },
      error: (error) => console.error('Error loading map data:', error),
    });
  }

  openInfoWindow(marker: MapMarker, place: Place): void {
    this.selectedPlace = place;
    this.infoWindow.open(marker);
  }
}
```

---

## 📝 Checklist de Desarrollo

### Setup
- [ ] Crear proyecto Angular
- [ ] Configurar TailwindCSS
- [ ] Configurar Firebase
- [ ] Configurar Google Maps
- [ ] Configurar routing y lazy loading

### Servicios Core
- [ ] ApiService base
- [ ] AuthService con Firebase Auth
- [ ] PlacesService
- [ ] CategoriasService
- [ ] BarriosService

### Guards e Interceptors
- [ ] AuthGuard
- [ ] RoleGuard
- [ ] authInterceptor
- [ ] errorInterceptor

### Componentes
- [ ] Navigation
- [ ] Footer
- [ ] HomePage
- [ ] SearchPage
- [ ] MapPage
- [ ] PlaceDetailPage
- [ ] CategoriasPage
- [ ] BarriosPage
- [ ] PublishPage
- [ ] AdminPage
- [ ] LoginPage

### Testing
- [ ] Tests unitarios de servicios
- [ ] Tests de componentes principales
- [ ] E2E tests críticos

---

**Versión**: 1.0  
**Última actualización**: 2025-11-06
