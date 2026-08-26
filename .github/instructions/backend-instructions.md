# Backend Instructions - API NestJS para Directorio Concón

## 📋 Resumen

Este documento detalla las instrucciones específicas para el desarrollo del backend del Directorio de Lugares de Concón usando **NestJS** y **Firebase** como Backend as a Service.

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
│   ├── places/
│   │   ├── dto/
│   │   │   ├── create-place.dto.ts
│   │   │   ├── update-place.dto.ts
│   │   │   └── search-place.dto.ts
│   │   ├── entities/
│   │   │   └── place.entity.ts
│   │   ├── places.controller.ts
│   │   ├── places.service.ts
│   │   └── places.module.ts
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

### 1. Módulo de Places

**places.service.ts**:
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { SearchPlaceDto } from './dto/search-place.dto';
import * as slugify from 'slugify';

@Injectable()
export class PlacesService {
  private readonly collection = 'places';

  constructor(private firebaseService: FirebaseService) {}

  async create(createDto: CreatePlaceDto, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    
    // Generar slug único
    const slug = await this.generateUniqueSlug(createDto.nombre);
    
    const placeData = {
      ...createDto,
      slug,
      usuarioId: userId,
      status: 'pendiente',
      destacado: false,
      verificado: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection(this.collection).add(placeData);
    
    // Crear solicitud de aprobación
    await firestore.collection('solicitudes').add({
      placeId: docRef.id,
      usuarioId: userId,
      tipo: 'registro',
      status: 'pendiente',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: docRef.id, ...placeData };
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

    const places = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalSnapshot = await firestore
      .collection(this.collection)
      .where('status', '==', 'aprobado')
      .count()
      .get();

    return {
      data: places,
      total: totalSnapshot.data().count,
      page,
      totalPages: Math.ceil(totalSnapshot.data().count / limit),
    };
  }

  async findOne(id: string) {
    const firestore = this.firebaseService.getFirestore();
    const doc = await firestore.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Place con ID ${id} no encontrado`);
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
    let places = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Búsqueda por texto (en memoria, no óptimo para gran escala)
    if (searchDto.q) {
      const searchTerm = searchDto.q.toLowerCase();
      places = places.filter(place =>
        place.nombre.toLowerCase().includes(searchTerm) ||
        place.descripcion?.toLowerCase().includes(searchTerm) ||
        place.descripcionCorta?.toLowerCase().includes(searchTerm) ||
        place.direccion?.toLowerCase().includes(searchTerm)
      );
    }

    // Paginación
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const offset = (page - 1) * limit;
    const paginatedPlaces = places.slice(offset, offset + limit);

    return {
      data: paginatedPlaces,
      total: places.length,
      page,
      totalPages: Math.ceil(places.length / limit),
    };
  }

  async update(id: string, updateDto: UpdatePlaceDto, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Place con ID ${id} no encontrado`);
    }

    const placeData = doc.data();
    
    // Verificar permisos (solo el dueño o admin pueden actualizar)
    if (placeData.usuarioId !== userId) {
      // Aquí verificar si es admin
      throw new BadRequestException('No tienes permisos para actualizar este place');
    }

    const updatedData = {
      ...updateDto,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.update(updatedData);

    return { id, ...placeData, ...updatedData };
  }

  async remove(id: string, userId: string) {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Place con ID ${id} no encontrado`);
    }

    const placeData = doc.data();
    
    // Verificar permisos
    if (placeData.usuarioId !== userId) {
      throw new BadRequestException('No tienes permisos para eliminar este place');
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

**places.controller.ts**:
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
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { SearchPlaceDto } from './dto/search-place.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nuevo place' })
  create(
    @Body() createDto: CreatePlaceDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.placesService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar places con paginación' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.placesService.findAll(page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar places con filtros' })
  search(@Query() searchDto: SearchPlaceDto) {
    return this.placesService.search(searchDto);
  }

  @Get('map-data')
  @ApiOperation({ summary: 'Obtener datos para mapa interactivo' })
  getMapData() {
    return this.placesService.getMapData();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener place por ID' })
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obtener place por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.placesService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar place' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlaceDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.placesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar place' })
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.placesService.remove(id, userId);
  }
}
```

### 2. DTOs con Validación

@Get(':id')
  @ApiOperation({ summary: 'Obtener place por ID' })
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obtener place por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.placesService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar place' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlaceDto,
    @CurrentUser('uid') userId: string,
  ) {
    return this.placesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar place' })
  remove(@Param('id') id: string, @CurrentUser('uid') userId: string) {
    return this.placesService.remove(id, userId);
  }
}
```

### 2. DTOs con Validación

**dto/create-place.dto.ts**:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsObject, ValidateNested, MinLength, MaxLength, IsNumber, IsArray, IsEnum, ArrayMaxSize } from 'class-validator';
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

class TurnoDto {
  @ApiProperty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  apertura: string;

  @ApiProperty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  cierre: string;
}

class HorarioDiaDto {
  @ApiProperty()
  @IsEnum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])
  dia: string;

  @ApiProperty()
  @IsBoolean()
  abierto: boolean;

  @ApiProperty({ type: [TurnoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  turnos: TurnoDto[];
}

class HorarioEspecialDto {
  @ApiProperty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty({ type: [TurnoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  turnos: TurnoDto[];
}

class RedSocialDto {
  @ApiProperty()
  @IsEnum(['instagram', 'facebook', 'x-twitter', 'linkedin', 'tiktok', 'youtube'])
  plataforma: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  url: string;
}

class ImagenesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  portada?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  galeria: string[];
}

export class CreatePlaceDto {
  @ApiProperty({ example: 'Restaurante El Marino' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Mariscos frescos con vista al mar en Concón' })
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  descripcionCorta: string;

  @ApiProperty({ example: 'Restaurante familiar especializado en mariscos y pescados frescos...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion: string;

  @ApiProperty({ example: 'gastronomia' })
  @IsString()
  @IsNotEmpty()
  categoriaId: string;

  @ApiPropertyOptional({ example: 'restaurantes' })
  @IsOptional()
  @IsString()
  subcategoriaId?: string;

  @ApiProperty({ example: 'barrio-centro' })
  @IsString()
  @IsNotEmpty()
  barrioId: string;

  @ApiProperty({ example: 'Av. Borgoño 12345, Concón' })
  @IsString()
  @MaxLength(200)
  direccion: string;

  @ApiPropertyOptional({ example: '+56932123456' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+56)?[2-9]\d{7,8}$/, { message: 'Formato de teléfono chileno inválido' })
  telefono?: string;

  @ApiPropertyOptional({ example: '+56932123456' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+56)?[2-9]\d{7,8}$/, { message: 'Formato de WhatsApp chileno inválido' })
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'contacto@elmarino.cl' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://www.elmarino.cl' })
  @IsOptional()
  @IsUrl()
  sitioWeb?: string;

  @ApiPropertyOptional({ type: [RedSocialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedSocialDto)
  @ArrayMaxSize(3)
  redesSociales?: RedSocialDto[];

  @ApiPropertyOptional({ type: ImagenesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImagenesDto)
  imagenes?: ImagenesDto;

  @ApiPropertyOptional({ type: [HorarioDiaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDiaDto)
  horarios?: HorarioDiaDto[];

  @ApiPropertyOptional({ type: [HorarioEspecialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioEspecialDto)
  horariosEspeciales?: HorarioEspecialDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  abierto24x7?: boolean;

  @ApiPropertyOptional({ type: [String], enum: ['wifi', 'estacionamiento', 'acceso-discapacidad', 'apto-mascotas', 'delivery', 'take-away', 'terraza', 'vista-al-mar', 'reservas', 'ninos-bienvenida'] })
  @IsOptional()
  @IsArray()
  @IsEnum(['wifi', 'estacionamiento', 'acceso-discapacidad', 'apto-mascotas', 'delivery', 'take-away', 'terraza', 'vista-al-mar', 'reservas', 'ninos-bienvenida'], { each: true })
  servicios?: string[];

  @ApiPropertyOptional({ type: [String], enum: ['efectivo', 'debito', 'credito', 'transferencia', 'qr'] })
  @IsOptional()
  @IsArray()
  @IsEnum(['efectivo', 'debito', 'credito', 'transferencia', 'qr'], { each: true })
  metodosPago?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  idiomas?: string[];

  @ApiPropertyOptional({ type: CoordenadasDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas?: CoordenadasDto;

  @ApiProperty({ enum: ['gratuito', 'premium'] })
  @IsEnum(['gratuito', 'premium'])
  planId: string;

  @ApiPropertyOptional({ example: 'auth-uid-ejemplo' })
  @IsOptional()
  @IsString()
  usuarioId?: string;
}
```

**dto/search-place.dto.ts**:
```typescript
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPlaceDto {
  @ApiPropertyOptional({ example: 'pizzería' })
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

  @ApiPropertyOptional({ enum: ['pendiente', 'aprobado', 'rechazado'] })
  @IsOptional()
  @IsEnum(['pendiente', 'aprobado', 'rechazado'])
  status?: string;

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

**places.service.spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PlacesService } from './places.service';
import { FirebaseService } from '../../config/firebase.config';

describe('PlacesService', () => {
  let service: PlacesService;
  let firebaseService: FirebaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesService,
        {
          provide: FirebaseService,
          useValue: {
            getFirestore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new place', async () => {
      const createDto = {
        nombre: 'Test Place',
        descripcionCorta: 'Descripción corta de prueba',
        descripcion: 'Descripción detallada de prueba con más de 10 caracteres',
        categoriaId: 'cat1',
        barrioId: 'bar1',
        direccion: 'Test 123',
        planId: 'gratuito',
      };

      // Mock Firestore methods
      // ...

      const result = await service.create(createDto, 'user123');
      expect(result.nombre).toBe('Test Place');
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
- [ ] Módulo de Places (CRUD completo)
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
