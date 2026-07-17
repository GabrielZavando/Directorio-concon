# Backend Instructions - API NestJS para Directorio Concón

## 📋 Resumen

Este documento detalla las instrucciones específicas para el desarrollo del backend del Directorio de Empresas de Concón usando **NestJS** y **Firebase** como Backend as a Service.

---

## 🚀 Setup Inicial

### 1. Crear Proyecto NestJS

```bash
# Instalar NestJS CLI
npm install -g @nestjs/cli

# Crear nuevo proyecto
nest new directorio-concon-backend
cd directorio-concon-backend

# Instalar dependencias adicionales
npm install firebase-admin
npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/throttler
```

### 2. Estructura de Carpetas

```
src/
├── modules/
│   ├── empresas/
│   │   ├── dto/
│   │   │   ├── create-empresa.dto.ts
│   │   │   ├── update-empresa.dto.ts
│   │   │   └── search-empresa.dto.ts
│   │   ├── entities/
│   │   │   └── empresa.entity.ts
│   │   ├── empresas.controller.ts
│   │   ├── empresas.service.ts
│   │   └── empresas.module.ts
│   ├── categorias/
│   │   ├── dto/
│   │   ├── categorias.controller.ts
│   │   ├── categorias.service.ts
│   │   └── categorias.module.ts
│   ├── barrios/
│   │   ├── dto/
│   │   ├── barrios.controller.ts
│   │   ├── barrios.service.ts
│   │   └── barrios.module.ts
│   ├── auth/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── usuarios/
│   │   ├── dto/
│   │   ├── usuarios.controller.ts
│   │   ├── usuarios.service.ts
│   │   └── usuarios.module.ts
│   └── solicitudes/
│       ├── dto/
│       ├── solicitudes.controller.ts
│       ├── solicitudes.service.ts
│       └── solicitudes.module.ts
├── common/
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── firestore-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── decorators/
│       └── api-paginated-response.decorator.ts
├── config/
│   ├── firebase.config.ts
│   ├── app.config.ts
│   └── swagger.config.ts
├── app.module.ts
└── main.ts
```

### 3. Configuración de Firebase Admin

**config/firebase.config.ts**:
```typescript
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  private firestore: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor(private configService: ConfigService) {
    const serviceAccount = {
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      privateKey: this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        .replace(/\\n/g, '\n'),
      clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.projectId}.appspot.com`,
    });

    this.firestore = admin.firestore();
    this.auth = admin.auth();
    this.storage = admin.storage();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.firestore;
  }

  getAuth(): admin.auth.Auth {
    return this.auth;
  }

  getStorage(): admin.storage.Storage {
    return this.storage;
  }
}
```

### 4. Configuración Principal

**main.ts**:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Directorio Concón API')
    .setDescription('API REST para el Directorio de Empresas de Concón')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Application running on: ${await app.getUrl()}`);
}
bootstrap();
```

---

## 🏗️ Módulos Principales

### 1. Módulo de Empresas

**empresas.service.ts**:
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { SearchEmpresaDto } from './dto/search-empresa.dto';
import * as slugify from 'slugify';

@Injectable()
export class EmpresasService {
  private readonly collection = 'empresas';

  constructor(private firebaseService: FirebaseService) {}

  async create(createDto: CreateEmpresaDto, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    
    // Generar slug único
    const slug = await this.generateUniqueSlug(createDto.nombre);
    
    const empresaData = {
      ...createDto,
      slug,
      usuarioId: userId,
      status: 'pendiente',
      destacado: false,
      verificado: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection(this.collection).add(empresaData);
    
    // Crear solicitud de aprobación
    await firestore.collection('solicitudes').add({
      empresaId: docRef.id,
      usuarioId: userId,
      tipo: 'registro',
      status: 'pendiente',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: docRef.id, ...empresaData };
  }

  async findAll(page: number = 1, limit: number = 20) {
    const firestore = this.firebaseService.getFirestore();
    const offset = (page - 1) * limit;

    const snapshot = await firestore
      .collection(this.collection)
      .where('status', '==', 'aprobado')
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    const empresas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalSnapshot = await firestore
      .collection(this.collection)
      .where('status', '==', 'aprobado')
      .count()
      .get();

    return {
      data: empresas,
      total: totalSnapshot.data().count,
      page,
      totalPages: Math.ceil(totalSnapshot.data().count / limit),
    };
  }

  async findOne(id: string) {
    const firestore = this.firebaseService.getFirestore();
    const doc = await firestore.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return { id: doc.id, ...doc.data() };
  }

  async findBySlug(slug: string) {
    const firestore = this.firebaseService.getFirestore();
    const snapshot = await firestore
      .collection(this.collection)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Empresa con slug ${slug} no encontrada`);
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async search(searchDto: SearchEmpresaDto) {
    const firestore = this.firebaseService.getFirestore();
    let query: any = firestore.collection(this.collection);

    // Filtro por status aprobado
    query = query.where('status', '==', 'aprobado');

    // Filtro por categoría
    if (searchDto.categoriaId) {
      query = query.where('categoriaId', '==', searchDto.categoriaId);
    }

    // Filtro por barrio
    if (searchDto.barrioId) {
      query = query.where('barrioId', '==', searchDto.barrioId);
    }

    // Filtro por destacado
    if (searchDto.destacado !== undefined) {
      query = query.where('destacado', '==', searchDto.destacado);
    }

    const snapshot = await query.get();
    let empresas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Búsqueda por texto (en memoria, no óptimo para gran escala)
    if (searchDto.q) {
      const searchTerm = searchDto.q.toLowerCase();
      empresas = empresas.filter(empresa =>
        empresa.nombre.toLowerCase().includes(searchTerm) ||
        empresa.descripcion?.toLowerCase().includes(searchTerm) ||
        empresa.direccion?.toLowerCase().includes(searchTerm)
      );
    }

    // Paginación
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const offset = (page - 1) * limit;
    const paginatedEmpresas = empresas.slice(offset, offset + limit);

    return {
      data: paginatedEmpresas,
      total: empresas.length,
      page,
      totalPages: Math.ceil(empresas.length / limit),
    };
  }

  async update(id: string, updateDto: UpdateEmpresaDto, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    const empresaData = doc.data();
    
    // Verificar permisos (solo el dueño o admin pueden actualizar)
    if (empresaData.usuarioId !== userId) {
      // Aquí verificar si es admin
      throw new BadRequestException('No tienes permisos para actualizar esta empresa');
    }

    const updatedData = {
      ...updateDto,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.update(updatedData);

    return { id, ...empresaData, ...updatedData };
  }

  async remove(id: string, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    const empresaData = doc.data();
    
    // Verificar permisos
    if (empresaData.usuarioId !== userId) {
      throw new BadRequestException('No tienes permisos para eliminar esta empresa');
    }

    await docRef.delete();
    return { message: 'Empresa eliminada exitosamente' };
  }

  async getMapData() {
    const firestore = this.firebaseService.getFirestore();
    
    const snapshot = await firestore
      .collection(this.collection)
      .where('status', '==', 'aprobado')
      .where('coordenadas', '!=', null)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre,
        slug: data.slug,
        categoriaId: data.categoriaId,
        direccion: data.direccion,
        coordenadas: data.coordenadas,
      };
    });
  }

  private async generateUniqueSlug(nombre: string): Promise<string> {
    const firestore = this.firebaseService.getFirestore();
    const baseSlug = slugify(nombre, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const snapshot = await firestore
        .collection(this.collection)
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
```

**empresas.controller.ts**:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { SearchEmpresaDto } from './dto/search-empresa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nueva empresa' })
  create(
    @Body() createDto: CreateEmpresaDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.empresasService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas con paginación' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.empresasService.findAll(page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar empresas con filtros' })
  search(@Query() searchDto: SearchEmpresaDto) {
    return this.empresasService.search(searchDto);
  }

  @Get('map-data')
  @ApiOperation({ summary: 'Obtener datos para mapa interactivo' })
  getMapData() {
    return this.empresasService.getMapData();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obtener empresa por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.empresasService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmpresaDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.empresasService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar empresa' })
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.empresasService.remove(id, userId);
  }
}
```

### 2. DTOs con Validación

**dto/create-empresa.dto.ts**:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsObject, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CoordenadasDto {
  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;
}

class RedesSocialesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitter?: string;
}

export class CreateEmpresaDto {
  @ApiProperty({ example: 'Restaurante La Perla' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ example: 'Restaurante de mariscos con vista al mar' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'cat-restaurantes' })
  @IsString()
  @IsNotEmpty()
  categoriaId: string;

  @ApiProperty({ example: 'barrio-centro' })
  @IsString()
  @IsNotEmpty()
  barrioId: string;

  @ApiProperty({ example: 'Av. Borgoño 12345, Concón' })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'contacto@laperla.cl' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://laperla.cl' })
  @IsOptional()
  @IsString()
  sitioWeb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RedesSocialesDto)
  redesSociales?: RedesSocialesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  horarios?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas?: CoordenadasDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
```

**dto/search-empresa.dto.ts**:
```typescript
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchEmpresaDto {
  @ApiPropertyOptional({ example: 'restaurante' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barrioId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  destacado?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

---

## 🔐 Autenticación y Autorización

### JWT Auth Guard

**guards/jwt-auth.guard.ts**:
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);
      
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
```

### Roles Guard

**guards/roles.guard.ts**:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseService } from '../../config/firebase.config';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Obtener datos del usuario desde Firestore
    const firestore = this.firebaseService.getFirestore();
    const userDoc = await firestore.collection('usuarios').doc(user.uid).get();

    if (!userDoc.exists) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const userData = userDoc.data();
    const hasRole = requiredRoles.includes(userData.rol);

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    return true;
  }
}
```

### Decorators

**decorators/current-user.decorator.ts**:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

**decorators/roles.decorator.ts**:
```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### Uso en Controllers

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
@ApiOperation({ summary: 'Crear categoría (solo admin)' })
createCategoria(@Body() createDto: CreateCategoriaDto) {
  return this.categoriasService.create(createDto);
}
```

---

## 🛡️ Manejo de Errores

**filters/http-exception.filter.ts**:
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
    }

    console.error('Exception caught:', exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

---

## 📊 Testing

**empresas.service.spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EmpresasService } from './empresas.service';
import { FirebaseService } from '../../config/firebase.config';

describe('EmpresasService', () => {
  let service: EmpresasService;
  let firebaseService: FirebaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresasService,
        {
          provide: FirebaseService,
          useValue: {
            getFirestore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new empresa', async () => {
      const createDto = {
        nombre: 'Test Empresa',
        categoriaId: 'cat1',
        barrioId: 'bar1',
        direccion: 'Test 123',
      };

      // Mock Firestore methods
      // ...

      const result = await service.create(createDto, 'user123');
      expect(result.nombre).toBe('Test Empresa');
    });
  });
});
```

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test
npm run test:watch
npm run test:cov

# Linting
npm run lint

# Generar nuevo módulo
nest g module modules/nuevos

# Generar nuevo controller
nest g controller modules/nuevos

# Generar nuevo service
nest g service modules/nuevos
```

---

## 📝 Checklist de Desarrollo

### Setup
- [ ] Instalar dependencias
- [ ] Configurar Firebase Admin SDK
- [ ] Configurar variables de entorno
- [ ] Configurar Swagger
- [ ] Configurar CORS

### Módulos Core
- [ ] Módulo de Empresas (CRUD completo)
- [ ] Módulo de Categorías
- [ ] Módulo de Barrios
- [ ] Módulo de Autenticación
- [ ] Módulo de Usuarios
- [ ] Módulo de Solicitudes

### Seguridad
- [ ] Implementar JWT Auth Guard
- [ ] Implementar Roles Guard
- [ ] Validación de DTOs
- [ ] Rate limiting
- [ ] CORS configurado correctamente

### Testing
- [ ] Tests unitarios para services
- [ ] Tests e2e para endpoints críticos
- [ ] Cobertura >80%

### Documentación
- [ ] Swagger completo con ejemplos
- [ ] README con instrucciones
- [ ] Comentarios en código complejo

---

**Versión**: 1.0  
**Última actualización**: 2025-11-06
