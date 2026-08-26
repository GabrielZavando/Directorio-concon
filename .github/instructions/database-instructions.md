# Database Instructions - Firebase/Firestore para Directorio Concón

## 📋 Resumen

Instrucciones detalladas para la configuración y gestión de la base de datos usando **Firebase** (Firestore, Authentication, Storage) para el Directorio de Empresas de Concón.

---

## 🔥 Setup de Firebase

### 1. Crear Proyecto Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Agregar proyecto"
3. Nombre: `directorio-concon`
4. Habilitar Google Analytics (opcional)
5. Click en "Crear proyecto"

### 2. Habilitar Servicios

#### Firestore Database
1. En la consola, ir a "Firestore Database"
2. Click en "Crear base de datos"
3. Seleccionar modo: **Producción** (con reglas de seguridad)
4. Ubicación: `us-central1` o la más cercana a Chile (`southamerica-east1`)
5. Click en "Habilitar"

#### Authentication
1. Ir a "Authentication"
2. Click en "Comenzar"
3. Habilitar proveedores:
   - ✅ Correo electrónico/contraseña
   - ⬜ Google (opcional)
   - ⬜ Facebook (opcional)

#### Storage
1. Ir a "Storage"
2. Click en "Comenzar"
3. Seleccionar modo de producción
4. Ubicación: Misma que Firestore
5. Click en "Listo"

### 3. Obtener Credenciales

#### Para Frontend (Web SDK)
1. Ir a "Configuración del proyecto" > "General"
2. En "Tus apps", click en el ícono web `</>`
3. Registrar app: `directorio-concon-web`
4. Copiar objeto `firebaseConfig`:

```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "directorio-concon.firebaseapp.com",
  projectId: "directorio-concon",
  storageBucket: "directorio-concon.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

#### Para Backend (Admin SDK)
1. Ir a "Configuración del proyecto" > "Cuentas de servicio"
2. Click en "Generar nueva clave privada"
3. Descargar archivo JSON
4. Extraer valores:
   - `project_id`
   - `private_key`
   - `client_email`

---

## 📊 Estructura de Firestore

### Colecciones y Documentos

#### Colecciones Principales (Core)

```
places/{placeId}
  - id: string (auto-generado)
  - nombre: string
  - slug: string (único, indexado)
  - descripcionCorta: string
  - descripcion: string
  - categoriaId: string (referencia)
  - subcategoriaId: string (opcional, referencia a categorias.subcategorias[].slug)
  - barrioId: string (referencia)
  - direccion: string
  - telefono: string (opcional)
  - whatsapp: string (opcional)
  - email: string (opcional)
  - sitioWeb: string (opcional)
  
  // REDES SOCIALES (máximo 3)
  - redesSociales: array<map> (máximo 3 elementos)
      - plataforma: string
      - url: string (URL completa al perfil)
  
  // IMÁGENES AGRUPADAS
  - imagenes: map
      - logo?: string
      - portada?: string
      - galeria: array<string>

  // SISTEMA DE PLANES
  - planId: string ('gratuito' | 'premium')
  - planStatus: string ('activo' | 'suspendido' | 'cancelado')
  - suscripcionId: string (opcional, referencia a suscripción)
  - planExpiraAt: timestamp (opcional, fecha de expiración premium)
  
  // HORARIOS ESTRUCTURADOS
  - horarios?: array<HorarioDia> (array de 7 días con turnos múltiples)
  - horariosEspeciales?: array<HorarioEspecial> (fechas especiales con turnos)
  - abierto24x7: boolean (default: false)
  
  // CAMPOS BÁSICOS (disponibles en ambos planes)
  - servicios: array<ServicioEnum> (wifi, estacionamiento, acceso-discapacidad, apto-mascotas, delivery, take-away, terraza, vista-al-mar, reservas, ninos-bienvenida)
  - metodosPago: array<MetodoPagoEnum> (efectivo, debito, credito, transferencia, qr)
  - coordenadas: map
      - lat: number
      - lng: number
  - idiomas: array<string> (post-MVP placeholder)
  
  // CAMPOS PREMIUM (solo plan premium)
  - galeria: array<map> (galería de imágenes adicionales)
      - id: string
      - url: string
      - descripcion: string (opcional)
      - orden: number
  - videoUrl: string (opcional, video promocional)
  - eslogan: string (opcional)
  - mision: string (opcional)
  - vision: string (opcional)
  - valores: array<string> (opcional)
  - especialidades: array<string> (opcional)
  - certificaciones: array<map> (opcional)
      - nombre: string
      - emisor: string
      - fechaObtencion: timestamp
      - url: string (opcional)
  - equipo: array<map> (opcional)
      - nombre: string
      - cargo: string
      - foto: string (opcional)
      - descripcion: string (opcional)
  - chatHabilitado: boolean (default: false, solo premium)
  - palabrasClave: array<string> (SEO, solo premium)
  - metaDescripcion: string (SEO, solo premium)
  
  // CAMPOS DE SISTEMA
  - destacado: boolean
  - verificado: boolean
  - fechaVerificacion: timestamp (opcional)
  - status: string (pendiente | aprobado | rechazado)
  - usuarioId: string
  - vistasTotales: number (post-MVP placeholder, default: 0)
  - valoracionGoogle: map (post-MVP placeholder)
      - rating: number
      - reviewsCount: number
      - mapsLink: string
  - fechaPublicacion: timestamp (opcional)
  - createdAt: timestamp
  - updatedAt: timestamp
  - lastViewedAt: timestamp

/categorias/{categoriaId}
  - id: string
  - nombre: string
  - slug: string (único)
  - descripcion: string
  - icono: string (nombre del icono Lucide)
  - color: string (color hexadecimal)
  - orden: number
  - activa: boolean
  - subcategorias: array<Subcategoria>
  - placeCount: number (número de places en esta categoría)
  - parentCategoryId: string (opcional, para subcategorías)
  - keywords: array<string> (palabras clave para búsqueda)
  - createdAt: timestamp
  - updatedAt: timestamp

/barrios/{barrioId}
  - id: string
  - nombre: string
  - slug: string (único)
  - codigo: string (código UV)
  - descripcion: string
  - coordenadas: map
      - lat: number
      - lng: number
  - tipo: string (urbano | rural)
  - placeCount: number (número de places en este barrio)
  - popularidad: number (0-1, basado en búsquedas)
  - caracteristicas: array<string> (playero, centro, comercial, etc.)
  - createdAt: timestamp
  - updatedAt: timestamp

/usuarios/{userId}
  - id: string (UID de Auth)
  - email: string
  - nombre: string
  - rol: string (admin | owner | member)
  - placeId: string (opcional)
  - telefono: string (opcional)
  - avatar: string (URL de avatar)
  - preferences: map
      - notifications: boolean
      - language: string
      - theme: string
  - lastLoginAt: timestamp
  - loginCount: number
  - isActive: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/solicitudes/{solicitudId}
  - id: string
  - placeId: string
  - usuarioId: string
  - tipo: string (registro | actualizacion | eliminacion)
  - status: string (pendiente | aprobado | rechazado)
  - comentarios: string (opcional)
  - revisadoPor: string (opcional)
  - motivoRechazo: string (opcional)
  - cambiosSolicitados: map (campos específicos a cambiar)
  - priority: string (low | medium | high)
  - createdAt: timestamp
  - revisadoAt: timestamp (opcional)
  - expiredAt: timestamp (opcional)
```

#### Colecciones de Reseñas y Feedback

```
/reviews/{reviewId}
  - id: string
  - placeId: string
  - usuarioId: string
  - rating: number (1-5)
  - title: string
  - content: string
  - pros: array<string>
  - cons: array<string>
  - visitDate: timestamp
  - isVerified: boolean
  - helpfulCount: number
  - reportCount: number
  - status: string (published | pending | rejected)
  - moderatedBy: string (opcional)
  - createdAt: timestamp
  - updatedAt: timestamp

/review-responses/{responseId}
  - id: string
  - reviewId: string
  - placeId: string
  - content: string
  - respondedBy: string (usuario ID del dueño de place)
  - isOfficial: boolean
  - createdAt: timestamp
```

#### Colecciones de Planes y Suscripciones (Nuevas)

```
/planes/{planId}
  - id: string ('gratuito' | 'premium')
  - nombre: string
  - descripcion: string
  - precio: number (0 para gratuito)
  - currency: string ('CLP')
  - duracion: number (días, 0 para ilimitado)
  - caracteristicas: array<string>
  - limites: map
      - maxRedesSociales: number (3 para ambos)
      - galeria: boolean (false para gratuito)
      - video: boolean (false para gratuito)
      - chat: boolean (false para gratuito)
      - seo: boolean (false para gratuito)
      - estadisticas: boolean (false para gratuito)
      - destacado: boolean (false para gratuito)
      - equipo: boolean (false para gratuito)
      - certificaciones: boolean (false para gratuito)
  - beneficios: array<string>
  - popular: boolean
  - activo: boolean
  - orden: number
  - createdAt: timestamp
  - updatedAt: timestamp

/suscripciones/{suscripcionId}
  - id: string
  - placeId: string
  - planId: string
  - usuarioId: string
  - status: string ('activa' | 'cancelada' | 'expirada' | 'suspendida')
  - metodoPago: string ('transferencia' | 'webpay' | 'paypal')
  - monto: number
  - currency: string ('CLP')
  - fechaInicio: timestamp
  - fechaVencimiento: timestamp
  - autoRenovar: boolean
  - transaccionId: string (opcional)
  - notasInternas: string (opcional)
  - motivoCancelacion: string (opcional)
  - createdAt: timestamp
  - updatedAt: timestamp
  - canceledAt: timestamp (opcional)

/pagos/{pagoId}
  - id: string
  - suscripcionId: string
  - placeId: string
  - monto: number
  - currency: string ('CLP')
  - status: string ('pendiente' | 'completado' | 'fallido' | 'reembolsado')
  - metodoPago: string
  - transaccionId: string
  - gateway: string ('webpay' | 'paypal' | 'transferencia')
  - fechaPago: timestamp (opcional)
  - comprobante: string (URL del comprobante)
  - notas: string (opcional)
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### Colecciones de Recursos Premium (Nuevas)

```
/recursos-digitales/{recursoId}
  - id: string
  - nombre: string
  - descripcion: string
  - tipo: string ('software' | 'almacenamiento' | 'descuento' | 'servicio')
  - categoria: string
  - valor: number (valor en CLP)
  - descuento: number (porcentaje para miembros premium)
  - disponible: boolean
  - limitado: boolean
  - stock: number (opcional, si es limitado)
  - vigencia: timestamp (opcional)
  - instrucciones: string (cómo acceder/usar)
  - enlace: string (URL al recurso)
  - imagen: string (URL de imagen promocional)
  - tags: array<string>
  - popularidad: number (0-1)
  - createdAt: timestamp
  - updatedAt: timestamp

/accesos-recursos/{accesoId}
  - id: string
  - recursoId: string
  - placeId: string  
  - usuarioId: string
  - status: string ('activo' | 'usado' | 'expirado')
  - codigoAcceso: string (opcional, código de descuento)
  - fechaAcceso: timestamp
  - fechaExpiracion: timestamp (opcional)
  - usosRestantes: number (opcional)
  - createdAt: timestamp
  - usedAt: timestamp (opcional)

/chat-empresarial/{chatId}
  - id: string
  - nombre: string (opcional, para chats grupales)
  - tipo: string ('directo' | 'grupo')
  - participantes: array<string> (IDs de usuarios)
  - placesParticipantes: array<string> (IDs de places)
  - ultimoMensaje: map
      - contenido: string
      - autorId: string
      - timestamp: timestamp
  - activo: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/mensajes-empresariales/{mensajeId}
  - id: string
  - chatId: string
  - autorId: string (usuario)
  - placeId: string (place del autor)
  - contenido: string
  - tipo: string ('texto' | 'imagen' | 'archivo' | 'enlace')
  - archivoUrl: string (opcional)
  - leido: array<string> (IDs de usuarios que han leído)
  - editado: boolean
  - timestamp: timestamp
  - editedAt: timestamp (opcional)
```

#### Colecciones de IA (Nuevas)

```
/ai-chat-sessions/{sessionId}
  - id: string
  - userId: string (opcional, null para anónimos)
  - sessionId: string (UUID único)
  - startedAt: timestamp
  - lastMessageAt: timestamp
  - messageCount: number
  - resolved: boolean
  - satisfaction: number (1-5, opcional)
  - deviceInfo: map
      - userAgent: string
      - isMobile: boolean
      - platform: string
  - location: map (opcional)
      - lat: number
      - lng: number
      - accuracy: number
  - intent: string (intención clasificada)
  - businessCategory: string (categoría más consultada)
  - averageResponseTime: number (ms)
  - totalTokensUsed: number
  - status: string (active | ended | timeout)

/ai-chat-messages/{messageId}
  - id: string
  - sessionId: string
  - isUser: boolean
  - content: string
  - timestamp: timestamp
  - intent: map
      - category: string (search | recommendation | information | complaint | other)
      - subcategory: string
      - confidence: number (0-1)
  - entities: array<map>
      - type: string (place | categoria | barrio | servicio | ubicacion | tiempo)
      - value: string
      - confidence: number
      - startIndex: number
      - endIndex: number
  - suggestions: array<string>
  - relatedEmpresas: array<map>
      - placeId: string
      - relevanceScore: number (0-1)
      - reason: string
  - processingTime: number (ms)
  - modelUsed: string
  - tokensUsed: number
  - wasCached: boolean
  - userFeedback: map (opcional)
      - helpful: boolean
      - rating: number (1-5)
      - comment: string

/ai-user-preferences/{userId}
  - id: string (userId)
  - preferredCategories: array<map>
      - categoriaId: string
      - weight: number (0-1)
      - lastInteraction: timestamp
  - preferredBarrios: array<map>
      - barrioId: string
      - weight: number (0-1)
      - reasons: array<string>
  - searchHistory: array<map>
      - query: string
      - timestamp: timestamp
      - resultCount: number
      - clickedResults: array<string>
      - searchMethod: string (text | voice | chat | filters)
      - location: map (opcional)
  - interactions: array<map>
      - placeId: string
      - type: string (view | contact | recommend | share | favorite | review)
      - timestamp: timestamp
      - duration: number (ms)
      - source: string (search | recommendation | map | category | chat)
      - rating: number (opcional)
  - aiPersonalization: map
      - preferredResponseStyle: string (formal | casual | detailed | brief)
      - language: string (es | en)
      - timezone: string
      - chatPersonality: string (professional | friendly | enthusiastic)
      - notificationPreferences: map
  - behaviorProfile: map
      - isFrequentUser: boolean
      - primaryUsageTime: string
      - devicePreference: string
      - averageSessionDuration: number
      - searchPatterns: array<string>
  - consentGiven: boolean
  - dataRetentionUntil: timestamp (opcional)
  - createdAt: timestamp
  - lastUpdated: timestamp

/ai-place-embeddings/{placeId}
  - id: string (placeId)
  - embeddings: map
      - description: array<number>
      - services: array<number>
      - reviews: array<number>
      - combined: array<number>
  - lastUpdated: timestamp
  - embeddingVersion: string
  - sourceContent: map
      - fullDescription: string
      - keyServices: array<string>
      - specialties: array<string>
      - atmosphere: array<string>
      - priceRange: string
      - targetAudience: array<string>
  - searchableFeatures: map
      - categoriaId: string
      - categoriaName: string
      - barrioId: string
      - barrioName: string
      - tags: array<string>
      - aiGeneratedTags: array<string>
      - semanticKeywords: array<string>
  - qualityMetrics: map
      - embeddingQualityScore: number (0-1)
      - contentCompleteness: number (0-1)
      - lastValidation: timestamp
      - needsUpdate: boolean
  - temporalContext: map
      - seasonalRelevance: array<string>
      - timeOfDayRelevance: array<string>
      - weekdayRelevance: array<string>
  - geographicalContext: map
      - proximity: map
          - beach: number
          - center: number
          - transportation: number
      - accessibility: array<string>

/ai-sentiment-analysis/{analysisId}
  - id: string
  - placeId: string
  - sourceType: string (review | chat_mention | social_media | survey | aggregated)
  - sourceId: string (opcional)
  - sentiment: map
      - overall: string (positive | neutral | negative)
      - score: number (-1 to 1)
      - confidence: number (0-1)
      - magnitude: number (0-1)
  - emotions: array<map>
      - emotion: string
      - intensity: number (0-1)
      - confidence: number (0-1)
  - aspectSentiments: array<map>
      - aspect: string (food | service | ambiance | price | location | cleanliness | speed | quality)
      - sentiment: number (-1 to 1)
      - mentions: number
      - keyPhrases: array<string>
      - importance: number (0-1)
  - topics: array<map>
      - topic: string
      - sentiment: number (-1 to 1)
      - mentions: number
      - relatedWords: array<string>
      - trend: string (improving | stable | declining)
  - summaries: map
      - brief: string
      - detailed: string
      - actionable: array<string>
      - strengths: array<string>
      - improvements: array<string>
  - analyzedAt: timestamp
  - modelVersion: string
  - processingTime: number
  - tokensUsed: number
  - period: map
      - start: timestamp
      - end: timestamp
      - sampleSize: number
  - comparisons: map
      - previousPeriod: number
      - categoryAverage: number
      - cityAverage: number
  - alerts: array<map>
      - type: string (sudden_drop | negative_trend | positive_spike | review_bomb)
      - severity: string (low | medium | high | critical)
      - description: string
      - actionRequired: boolean

/ai-business-insights/{insightId}
  - id: string
  - placeId: string
  - period: map
      - start: timestamp
      - end: timestamp
      - type: string (daily | weekly | monthly | quarterly | custom)
  - metrics: map
      - totalViews: number
      - uniqueVisitors: number
      - pageViews: number
      - averageSessionDuration: number
      - bounceRate: number
      - searchImpressions: number
      - searchClicks: number
      - clickThroughRate: number
      - averageSearchPosition: number
      - organicTraffic: number
      - contactRequests: number
      - phoneClicks: number
      - emailClicks: number
      - websiteClicks: number
      - directionsRequests: number
      - socialMediaClicks: number
      - aiRecommendations: number
      - recommendationClicks: number
      - chatbotMentions: number
      - voiceSearches: number
  - insights: map
      - performance: array<map>
      - competitive: array<map>
      - customer: array<map>
      - operational: array<map>
  - predictions: array<map>
      - timeframe: string
      - metric: string
      - currentValue: number
      - predictedValue: number
      - confidence: number
      - factors: array<string>
      - scenarios: array<map>
  - actionRecommendations: array<map>
      - category: string
      - action: string
      - description: string
      - priority: string
      - effort: string
      - expectedImpact: number
      - timeline: string
      - cost: string
      - resources: array<string>
  - benchmarks: array<map>
      - metric: string
      - value: number
      - categoryAverage: number
      - cityAverage: number
      - topPerformer: number
      - percentile: number
      - trend: string
  - generatedAt: timestamp
  - aiModel: string
  - processingTime: number
  - dataQuality: number
  - confidence: number
  - status: string (draft | ready | delivered | reviewed)
  - viewedBy: array<string>
  - actionsImplemented: array<string>
  - feedback: array<map>

/ai-recommendation-models/{userId}
  - id: string (userId)
  - userProfile: map
      - demographicProfile: map
      - behaviorProfile: map
      - preferenceVector: array<number>
      - categoryWeights: array<map>
      - locationBias: map
  - recommendationHistory: array<map>
      - recommendationId: string
      - placeId: string
      - score: number
      - algorithm: string
      - reason: string
      - timestamp: timestamp
      - userAction: string
      - feedback: map (opcional)
      - context: map
  - similarUsers: array<map>
      - userId: string
      - similarity: number
      - commonInterests: array<string>
      - lastCalculated: timestamp
  - modelVersion: string
  - lastTraining: timestamp
  - accuracy: number
  - confidence: number
  - dataPoints: number

/ai-search-analytics/{searchId}
  - id: string
  - searchQuery: string
  - normalizedQuery: string
  - queryVector: array<number> (opcional)
  - userId: string (opcional)
  - sessionId: string
  - timestamp: timestamp
  - searchContext: map
      - userLocation: map (opcional)
      - device: string
      - source: string
      - previousQueries: array<string>
      - timeOfDay: string
      - dayOfWeek: string
      - weather: map (opcional)
  - intentAnalysis: map
      - primaryIntent: string
      - confidence: number
      - entities: array<map>
      - searchComplexity: string
  - searchResults: map
      - totalResults: number
      - resultsSources: map
      - topResults: array<map>
      - userInteractions: map
  - qualityMetrics: map
      - queryClarity: number
      - resultRelevance: number
      - userSatisfaction: number (opcional)
      - searchSuccess: boolean
      - searchLatency: number
      - aiProcessingTime: number
      - cacheHitRate: number
  - suggestions: map
      - queryImprovements: array<string>
      - missingBusinessTypes: array<string>
      - featureRequests: array<string>
  - followUp: map
      - refinedSearches: array<string>
      - alternativeQueries: array<string>
      - finalAction: string

/ai-model-performance/{performanceId}
  - id: string
  - modelType: string (chatbot | recommendations | search | sentiment | embeddings)
  - modelVersion: string
  - evaluationPeriod: map
      - start: timestamp
      - end: timestamp
      - totalRequests: number
      - totalUsers: number
  - accuracyMetrics: map
      - overallAccuracy: number
      - precision: number
      - recall: number
      - f1Score: number
      - categoryPerformance: array<map>
  - userSatisfaction: map
      - averageRating: number
      - totalRatings: number
      - ratingDistribution: array<map>
      - positiveComments: array<string>
      - negativeComments: array<string>
      - improvementSuggestions: array<string>
  - performanceMetrics: map
      - averageResponseTime: number
      - cacheHitRate: number
      - errorRate: number
      - uptime: number
      - totalCost: number
      - costPerRequest: number
      - tokenUsage: map
  - abTestResults: array<map> (opcional)
  - recommendations: array<map>
  - trends: array<map>
  - generatedAt: timestamp
  - nextEvaluationScheduled: timestamp
```

#### Colecciones de Analytics y Tracking

```
/analytics-events/{eventId}
  - id: string
  - userId: string (opcional)
  - sessionId: string
  - eventType: string (page_view | search | click | contact | etc.)
  - eventData: map (datos específicos del evento)
  - timestamp: timestamp
  - deviceInfo: map
  - location: map (opcional)
  - source: string (organic | direct | referral | social)

/user-sessions/{sessionId}
  - id: string
  - userId: string (opcional)
  - startTime: timestamp
  - endTime: timestamp (opcional)
  - duration: number (ms)
  - pageViews: number
  - interactions: number
  - deviceInfo: map
  - referrer: string
  - exitPage: string
  - isActive: boolean
```

---

## 🔒 Reglas de Seguridad Firestore

**firestore.rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isPlaceOwner(placeId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/places/$(placeId)).data.usuarioId == request.auth.uid;
    }

    // EMPRESAS
    match /places/{placeId} {
      // Lectura: Cualquiera puede leer places aprobados
      allow read: if resource.data.status == 'aprobado' || 
                     isAdmin() || 
                     isOwner(resource.data.usuarioId);
      
      // Creación: Usuario autenticado
      allow create: if isAuthenticated() && 
                       request.resource.data.usuarioId == request.auth.uid &&
                       request.resource.data.status == 'pendiente';
      
      // Actualización: Dueño o admin
      allow update: if isAdmin() || 
                       (isOwner(resource.data.usuarioId) && 
                        request.resource.data.status == resource.data.status); // No puede cambiar status
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // CATEGORIAS
    match /categorias/{categoriaId} {
      // Lectura: Todos (categorías públicas)
      allow read: if true;
      
      // Escritura: Solo admin
      allow create, update, delete: if isAdmin();
    }

    // BARRIOS
    match /barrios/{barrioId} {
      // Lectura: Todos (barrios públicos)
      allow read: if true;
      
      // Escritura: Solo admin
      allow create, update, delete: if isAdmin();
    }

    // USUARIOS
    match /usuarios/{userId} {
      // Lectura: Solo el propio usuario o admin
      allow read: if isOwner(userId) || isAdmin();
      
      // Creación: Al registrarse (via backend)
      allow create: if isOwner(userId);
      
      // Actualización: Solo el propio usuario o admin
      allow update: if isOwner(userId) || isAdmin();
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // SOLICITUDES
    match /solicitudes/{solicitudId} {
      // Lectura: Dueño del place o admin
      allow read: if isAdmin() || 
                     isOwner(resource.data.usuarioId);
      
      // Creación: Usuario autenticado
      allow create: if isAuthenticated() && 
                       request.resource.data.usuarioId == request.auth.uid;
      
      // Actualización: Solo admin (para aprobar/rechazar)
      allow update: if isAdmin();
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // REVIEWS - Nuevas reglas para reseñas
    match /reviews/{reviewId} {
      // Lectura: Todos pueden leer reseñas publicadas
      allow read: if resource.data.status == 'published';
      
      // Creación: Usuario autenticado, una reseña por place
      allow create: if isAuthenticated() && 
                       request.resource.data.usuarioId == request.auth.uid &&
                       request.resource.data.status == 'pending';
      
      // Actualización: Solo el autor o admin
      allow update: if isAdmin() || 
                       (isOwner(resource.data.usuarioId) && 
                        resource.data.status == 'published');
      
      // Eliminación: Solo admin o el autor
      allow delete: if isAdmin() || isOwner(resource.data.usuarioId);
    }

    // REVIEW RESPONSES
    match /review-responses/{responseId} {
      // Lectura: Todos pueden leer respuestas
      allow read: if true;
      
      // Creación: Solo dueño de place o admin
      allow create: if isAuthenticated() && 
                       (isAdmin() || 
                        get(/databases/$(database)/documents/places/$(request.resource.data.placeId)).data.usuarioId == request.auth.uid);
      
      // Actualización y eliminación: Solo el autor o admin
      allow update, delete: if isAdmin() || isOwner(resource.data.respondedBy);
    }

    // AI CHAT SESSIONS
    match /ai-chat-sessions/{sessionId} {
      // Lectura: Solo el propietario de la sesión o admin
      allow read: if isAdmin() || 
                     (resource.data.userId != null && isOwner(resource.data.userId));
      
      // Creación: Backend service account o usuario autenticado
      allow create: if isAuthenticated();
      
      // Actualización: Solo el propietario o admin
      allow update: if isAdmin() || 
                       (resource.data.userId != null && isOwner(resource.data.userId));
      
      // Eliminación: Solo admin (para GDPR compliance)
      allow delete: if isAdmin();
    }

    // AI CHAT MESSAGES
    match /ai-chat-messages/{messageId} {
      // Lectura: Solo el propietario de la sesión o admin
      allow read: if isAdmin() || 
                     exists(/databases/$(database)/documents/ai-chat-sessions/$(resource.data.sessionId)) &&
                     (get(/databases/$(database)/documents/ai-chat-sessions/$(resource.data.sessionId)).data.userId == null ||
                      get(/databases/$(database)/documents/ai-chat-sessions/$(resource.data.sessionId)).data.userId == request.auth.uid);
      
      // Creación: Backend service account
      allow create: if isAuthenticated();
      
      // Actualización: Solo para feedback del usuario o admin
      allow update: if isAdmin() || 
                       (exists(/databases/$(database)/documents/ai-chat-sessions/$(resource.data.sessionId)) &&
                        get(/databases/$(database)/documents/ai-chat-sessions/$(resource.data.sessionId)).data.userId == request.auth.uid);
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // AI USER PREFERENCES
    match /ai-user-preferences/{userId} {
      // Lectura: Solo el propio usuario o admin
      allow read: if isOwner(userId) || isAdmin();
      
      // Creación y actualización: Solo el propio usuario o backend
      allow create, update: if isOwner(userId) || isAdmin();
      
      // Eliminación: Solo el usuario (GDPR) o admin
      allow delete: if isOwner(userId) || isAdmin();
    }

    // AI EMPRESA EMBEDDINGS
    match /ai-place-embeddings/{placeId} {
      // Lectura: Solo backend service o admin
      allow read: if isAdmin();
      
      // Escritura: Solo backend service
      allow create, update, delete: if isAdmin();
    }

    // AI SENTIMENT ANALYSIS
    match /ai-sentiment-analysis/{analysisId} {
      // Lectura: Dueño del place o admin
      allow read: if isAdmin() || 
                     (exists(/databases/$(database)/documents/places/$(resource.data.placeId)) &&
                      get(/databases/$(database)/documents/places/$(resource.data.placeId)).data.usuarioId == request.auth.uid);
      
      // Escritura: Solo backend service
      allow create, update, delete: if isAdmin();
    }

    // AI BUSINESS INSIGHTS
    match /ai-business-insights/{insightId} {
      // Lectura: Dueño del place o admin
      allow read: if isAdmin() || 
                     (exists(/databases/$(database)/documents/places/$(resource.data.placeId)) &&
                      get(/databases/$(database)/documents/places/$(resource.data.placeId)).data.usuarioId == request.auth.uid);
      
      // Actualización: Solo para feedback del usuario o admin
      allow update: if isAdmin() || 
                       (exists(/databases/$(database)/documents/places/$(resource.data.placeId)) &&
                        get(/databases/$(database)/documents/places/$(resource.data.placeId)).data.usuarioId == request.auth.uid &&
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewedBy', 'actionsImplemented', 'feedback']));
      
      // Creación y eliminación: Solo backend service
      allow create, delete: if isAdmin();
    }

    // AI RECOMMENDATION MODELS
    match /ai-recommendation-models/{userId} {
      // Lectura: Solo el propio usuario o admin
      allow read: if isOwner(userId) || isAdmin();
      
      // Escritura: Solo backend service
      allow create, update, delete: if isAdmin();
    }

    // AI SEARCH ANALYTICS
    match /ai-search-analytics/{searchId} {
      // Lectura: Solo admin (datos sensibles)
      allow read: if isAdmin();
      
      // Escritura: Solo backend service
      allow create, update, delete: if isAdmin();
    }

    // AI MODEL PERFORMANCE
    match /ai-model-performance/{performanceId} {
      // Lectura: Solo admin
      allow read: if isAdmin();
      
      // Escritura: Solo backend service
      allow create, update, delete: if isAdmin();
    }

    // ANALYTICS EVENTS
    match /analytics-events/{eventId} {
      // Lectura: Solo admin
      allow read: if isAdmin();
      
      // Creación: Cualquier usuario (para tracking)
      allow create: if true;
      
      // Actualización y eliminación: Solo admin
      allow update, delete: if isAdmin();
    }

    // USER SESSIONS
    match /user-sessions/{sessionId} {
      // Lectura: Solo el propio usuario o admin
      allow read: if isAdmin() || 
                     (resource.data.userId != null && isOwner(resource.data.userId));
      
      // Creación y actualización: Usuario o backend
      allow create, update: if isAuthenticated();
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // PLANES
    match /planes/{planId} {
      // Lectura: Todos pueden ver los planes disponibles
      allow read: if resource.data.activo == true;
      
      // Escritura: Solo admin
      allow create, update, delete: if isAdmin();
    }

    // SUSCRIPCIONES
    match /suscripciones/{suscripcionId} {
      // Lectura: Solo el dueño del place o admin
      allow read: if isAdmin() || 
                     (exists(/databases/$(database)/documents/places/$(resource.data.placeId)) &&
                      get(/databases/$(database)/documents/places/$(resource.data.placeId)).data.usuarioId == request.auth.uid);
      
      // Creación: Usuario autenticado para su place
      allow create: if isAuthenticated() && 
                       exists(/databases/$(database)/documents/places/$(request.resource.data.placeId)) &&
                       get(/databases/$(database)/documents/places/$(request.resource.data.placeId)).data.usuarioId == request.auth.uid;
      
      // Actualización: Solo admin (para cambios de estado) o dueño (para cancelación)
      allow update: if isAdmin() || 
                       (isOwner(resource.data.usuarioId) && 
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'autoRenovar', 'motivoCancelacion', 'canceledAt']));
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // PAGOS
    match /pagos/{pagoId} {
      // Lectura: Solo el dueño del place o admin
      allow read: if isAdmin() || 
                     (exists(/databases/$(database)/documents/places/$(resource.data.placeId)) &&
                      get(/databases/$(database)/documents/places/$(resource.data.placeId)).data.usuarioId == request.auth.uid);
      
      // Escritura: Solo admin o backend service
      allow create, update, delete: if isAdmin();
    }

    // RECURSOS DIGITALES
    match /recursos-digitales/{recursoId} {
      // Lectura: Solo places premium pueden ver recursos
      allow read: if isAdmin() || 
                     (isAuthenticated() && isPremiumUser());
      
      // Escritura: Solo admin
      allow create, update, delete: if isAdmin();
    }

    // ACCESOS A RECURSOS
    match /accesos-recursos/{accesoId} {
      // Lectura: Solo el dueño o admin
      allow read: if isAdmin() || 
                     (isOwner(resource.data.usuarioId));
      
      // Creación: Solo admin (cuando otorga acceso) o sistema automático
      allow create: if isAdmin();
      
      // Actualización: Solo admin o el usuario (para marcar como usado)
      allow update: if isAdmin() || 
                       (isOwner(resource.data.usuarioId) && 
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'usedAt', 'usosRestantes']));
      
      // Eliminación: Solo admin
      allow delete: if isAdmin();
    }

    // CHAT EMPRESARIAL
    match /chat-empresarial/{chatId} {
      // Lectura: Solo participantes o admin
      allow read: if isAdmin() || 
                     (isAuthenticated() && 
                      request.auth.uid in resource.data.participantes &&
                      isPremiumUser());
      
      // Creación: Solo usuarios premium
      allow create: if isAuthenticated() && 
                       isPremiumUser() &&
                       request.auth.uid in request.resource.data.participantes;
      
      // Actualización: Solo participantes o admin
      allow update: if isAdmin() || 
                       (isAuthenticated() && 
                        request.auth.uid in resource.data.participantes &&
                        isPremiumUser());
      
      // Eliminación: Solo admin o creador del chat
      allow delete: if isAdmin();
    }

    // MENSAJES EMPRESARIALES
    match /mensajes-empresariales/{mensajeId} {
      // Lectura: Solo participantes del chat o admin
      allow read: if isAdmin() || 
                     (isAuthenticated() && 
                      exists(/databases/$(database)/documents/chat-empresarial/$(resource.data.chatId)) &&
                      request.auth.uid in get(/databases/$(database)/documents/chat-empresarial/$(resource.data.chatId)).data.participantes);
      
      // Creación: Solo participantes premium del chat
      allow create: if isAuthenticated() && 
                       isPremiumUser() &&
                       exists(/databases/$(database)/documents/chat-empresarial/$(request.resource.data.chatId)) &&
                       request.auth.uid in get(/databases/$(database)/documents/chat-empresarial/$(request.resource.data.chatId)).data.participantes;
      
      // Actualización: Solo el autor del mensaje (para editar)
      allow update: if isAdmin() || 
                       (isOwner(resource.data.autorId) && 
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['contenido', 'editado', 'editedAt']));
      
      // Eliminación: Solo admin o el autor
      allow delete: if isAdmin() || isOwner(resource.data.autorId);
    }
  }

  // FUNCIÓN AUXILIAR PARA VERIFICAR USUARIOS PREMIUM
  function isPremiumUser() {
    return isAuthenticated() && 
           exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.placeId != null &&
           exists(/databases/$(database)/documents/places/$(get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.placeId)) &&
           get(/databases/$(database)/documents/places/$(get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.placeId)).data.planId == 'premium' &&
           get(/databases/$(database)/documents/places/$(get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.placeId)).data.planStatus == 'activo';
  }
}
```

### Deployment de Reglas

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto
firebase init firestore

# Deploy reglas
firebase deploy --only firestore:rules
```

---

## 🖼️ Reglas de Seguridad Storage

**storage.rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isValidImage() {
      return request.resource.size < 10 * 1024 * 1024 && // 10MB max
             request.resource.contentType.matches('image/.*');
    }
    
    // LOGOS DE EMPRESAS
    match /places/{placeId}/logo/{fileName} {
      // Lectura: Público (para mostrar en web)
      allow read: if true;
      
      // Escritura: Usuario autenticado que es dueño del place
      allow write: if isAuthenticated() && 
                      isValidImage() &&
                      exists(/databases/$(database)/documents/places/$(placeId)) &&
                      get(/databases/$(database)/documents/places/$(placeId)).data.usuarioId == request.auth.uid;
      
      // Eliminación: Dueño del place o admin
      allow delete: if isAuthenticated();
    }
    
    // Carpeta temporal para uploads
    match /temp/{userId}/{fileName} {
      allow write: if isAuthenticated() && 
                      request.auth.uid == userId &&
                      isValidImage();
      
      allow read: if isAuthenticated() && request.auth.uid == userId;
    }
  }
}
```

### Deployment de Reglas de Storage

```bash
firebase deploy --only storage:rules
```

---

## 🔍 Índices Compuestos

Los índices compuestos son necesarios para queries complejas. Firebase los sugerirá automáticamente en logs de error.

### Crear Índices Manualmente

#### Via Firebase Console
1. Ir a "Firestore Database" > "Índices"
2. Click en "Crear índice"

#### Via CLI (firebase.indexes.json)

**firestore.indexes.json**:

```json
{
  "indexes": [
    // CORE COLLECTIONS INDEXES
    
    // places - Búsquedas por categoría
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "categoriaId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Búsquedas por barrio
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "barrioId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Listado con destacados
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "destacado", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Por rating
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Por usuario
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Verificadas
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "verificado", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    
    // categorias - Activas ordenadas
    {
      "collectionGroup": "categorias",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "activa", "order": "ASCENDING" },
        { "fieldPath": "orden", "order": "ASCENDING" }
      ]
    },
    // categorias - Por parent
    {
      "collectionGroup": "categorias",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "parent", "order": "ASCENDING" },
        { "fieldPath": "orden", "order": "ASCENDING" }
      ]
    },
    
    // barrios - Activos ordenados
    {
      "collectionGroup": "barrios",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "activo", "order": "ASCENDING" },
        { "fieldPath": "orden", "order": "ASCENDING" }
      ]
    },
    
    // usuarios - Por rol
    {
      "collectionGroup": "usuarios",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "rol", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // solicitudes - Por status
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // solicitudes - Por usuario
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // solicitudes - Por tipo
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tipo", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    
    // REVIEWS COLLECTIONS INDEXES
    
    // reviews - Por place
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // reviews - Por usuario
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // reviews - Por rating
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    },
    
    // review-responses - Por review
    {
      "collectionGroup": "review-responses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reviewId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // AI COLLECTIONS INDEXES
    
    // ai-chat-sessions - Por usuario
    {
      "collectionGroup": "ai-chat-sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // ai-chat-sessions - Por tipo
    {
      "collectionGroup": "ai-chat-sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // ai-chat-sessions - Por status
    {
      "collectionGroup": "ai-chat-sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    
    // ai-chat-messages - Por sesión
    {
      "collectionGroup": "ai-chat-messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    // ai-chat-messages - Por tipo
    {
      "collectionGroup": "ai-chat-messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    
    // ai-sentiment-analysis - Por place
    {
      "collectionGroup": "ai-sentiment-analysis",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // ai-sentiment-analysis - Por sentiment
    {
      "collectionGroup": "ai-sentiment-analysis",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sentiment", "order": "ASCENDING" },
        { "fieldPath": "confidence", "order": "DESCENDING" }
      ]
    },
    
    // ai-business-insights - Por place
    {
      "collectionGroup": "ai-business-insights",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // ai-business-insights - Por tipo y prioridad
    {
      "collectionGroup": "ai-business-insights",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" }
      ]
    },
    
    // ai-search-analytics - Por usuario
    {
      "collectionGroup": "ai-search-analytics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // ai-search-analytics - Por query
    {
      "collectionGroup": "ai-search-analytics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "query", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    
    // ai-model-performance - Por modelo y versión
    {
      "collectionGroup": "ai-model-performance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "modelType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // ai-model-performance - Por accuracy
    {
      "collectionGroup": "ai-model-performance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accuracy", "order": "DESCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    
    // ANALYTICS COLLECTIONS INDEXES
    
    // analytics-events - Por tipo
    {
      "collectionGroup": "analytics-events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // analytics-events - Por usuario
    {
      "collectionGroup": "analytics-events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // analytics-events - Por place
    {
      "collectionGroup": "analytics-events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // analytics-events - Por sesión
    {
      "collectionGroup": "analytics-events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    
    // user-sessions - Por usuario
    {
      "collectionGroup": "user-sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    // user-sessions - Por dispositivo
    {
      "collectionGroup": "user-sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deviceInfo.type", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    
    // PLANES Y SUSCRIPCIONES INDEXES
    
    // planes - Activos ordenados
    {
      "collectionGroup": "planes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "activo", "order": "ASCENDING" },
        { "fieldPath": "orden", "order": "ASCENDING" }
      ]
    },
    // planes - Por precio
    {
      "collectionGroup": "planes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "activo", "order": "ASCENDING" },
        { "fieldPath": "precio", "order": "ASCENDING" }
      ]
    },
    
    // suscripciones - Por place
    {
      "collectionGroup": "suscripciones",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // suscripciones - Por status
    {
      "collectionGroup": "suscripciones",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "fechaVencimiento", "order": "ASCENDING" }
      ]
    },
    // suscripciones - Por plan
    {
      "collectionGroup": "suscripciones",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "planId", "order": "ASCENDING" },
        { "fieldPath": "fechaInicio", "order": "DESCENDING" }
      ]
    },
    
    // pagos - Por suscripción
    {
      "collectionGroup": "pagos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "suscripcionId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // pagos - Por status
    {
      "collectionGroup": "pagos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // pagos - Por place
    {
      "collectionGroup": "pagos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "fechaPago", "order": "DESCENDING" }
      ]
    },
    
    // RECURSOS PREMIUM INDEXES
    
    // recursos-digitales - Por tipo
    {
      "collectionGroup": "recursos-digitales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tipo", "order": "ASCENDING" },
        { "fieldPath": "disponible", "order": "ASCENDING" },
        { "fieldPath": "popularidad", "order": "DESCENDING" }
      ]
    },
    // recursos-digitales - Por categoría
    {
      "collectionGroup": "recursos-digitales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "categoria", "order": "ASCENDING" },
        { "fieldPath": "disponible", "order": "ASCENDING" }
      ]
    },
    
    // accesos-recursos - Por usuario
    {
      "collectionGroup": "accesos-recursos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // accesos-recursos - Por place
    {
      "collectionGroup": "accesos-recursos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "placeId", "order": "ASCENDING" },
        { "fieldPath": "fechaAcceso", "order": "DESCENDING" }
      ]
    },
    // accesos-recursos - Por recurso
    {
      "collectionGroup": "accesos-recursos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recursoId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    
    // CHAT EMPRESARIAL INDEXES
    
    // chat-empresarial - Por participante
    {
      "collectionGroup": "chat-empresarial",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "participantes", "arrayConfig": "CONTAINS" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    // chat-empresarial - Por tipo
    {
      "collectionGroup": "chat-empresarial",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tipo", "order": "ASCENDING" },
        { "fieldPath": "activo", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    
    // mensajes-empresariales - Por chat
    {
      "collectionGroup": "mensajes-empresariales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "chatId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    // mensajes-empresariales - Por autor
    {
      "collectionGroup": "mensajes-empresariales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "autorId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    
    // EVENTOS INDEXES
    
    // eventos - Por categoriaId y fechaInicio
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "categoriaId", "order": "ASCENDING" },
        { "fieldPath": "fechaInicio", "order": "ASCENDING" }
      ]
    },
    // eventos - Por barrioId y fechaInicio
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "barrioId", "order": "ASCENDING" },
        { "fieldPath": "fechaInicio", "order": "ASCENDING" }
      ]
    },
    // eventos - Por status, destacado y fechaInicio (listado público)
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "destacado", "order": "DESCENDING" },
        { "fieldPath": "fechaInicio", "order": "ASCENDING" }
      ]
    },
    // eventos - Por slug (único)
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "slug", "order": "ASCENDING" }
      ]
    },
    // eventos - Por usuarioId y createdAt (mis eventos)
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // eventos - Por fechaInicio y estado (eventos próximos)
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "fechaInicio", "order": "ASCENDING" },
        { "fieldPath": "estado", "order": "ASCENDING" }
      ]
    },
    // eventos - Por subcategoriaId y fechaInicio
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "subcategoriaId", "order": "ASCENDING" },
        { "fieldPath": "fechaInicio", "order": "ASCENDING" }
      ]
    },
    // solicitudes - Por eventoId y status
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventoId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    
    // INDEXES ADICIONALES PARA EMPRESAS CON PLANES
    
    // places - Por plan
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "planId", "order": "ASCENDING" },
        { "fieldPath": "planStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // places - Premium activas
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "planId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "destacado", "order": "DESCENDING" }
      ]
    },
    // places - Por vencimiento de plan
    {
      "collectionGroup": "places",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "planExpiraAt", "order": "ASCENDING" },
        { "fieldPath": "planStatus", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    // Campos únicos que necesitan índices especiales
    {
      "collectionGroup": "places",
      "fieldPath": "slug",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    },
    {
      "collectionGroup": "categorias",
      "fieldPath": "slug",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    },
    {
      "collectionGroup": "barrios",
      "fieldPath": "slug",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    },
    {
      "collectionGroup": "usuarios",
      "fieldPath": "email",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    },
    // Coordenadas para geoqueries
    {
      "collectionGroup": "places",
      "fieldPath": "coordenadas.lat",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    },
    {
      "collectionGroup": "places",
      "fieldPath": "coordenadas.lng",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
```

### Deployment de Índices

```bash
firebase deploy --only firestore:indexes
```

---

## � Sistema de Planes y Monetización

### Diferencias entre Planes

#### Plan Gratuito
- ✅ Perfil básico de place
- ✅ Información de contacto (teléfono, email, dirección)
- ✅ Hasta 3 redes sociales flexibles
- ✅ Logo de place
- ✅ Descripción básica y servicios
- ✅ Ubicación en mapa
- ✅ Horarios de atención
- ❌ Galería de imágenes adicionales
- ❌ Video promocional
- ❌ Información avanzada de place (misión, visión, valores)
- ❌ Equipo de trabajo
- ❌ Chat entre places
- ❌ Acceso a recursos digitales
- ❌ SEO avanzado
- ❌ Estadísticas detalladas

#### Plan Premium ($19.990 CLP/mes)
- ✅ **Todas las características del plan gratuito**
- ✅ Galería de imágenes (hasta 10 fotos)
- ✅ Video promocional (YouTube/Vimeo embed)
- ✅ Información completa de place (misión, visión, valores)
- ✅ Perfil de equipo con fotos y descripciones
- ✅ Certificaciones y reconocimientos
- ✅ Chat entre places con otros miembros premium
- ✅ Acceso a recursos digitales exclusivos:
  - Software de gestión de places
  - Almacenamiento en la nube (100GB)
  - Descuentos en servicios de desarrollo web
  - Plantillas de marketing digital
  - Consultorías gratuitas mensuales
- ✅ SEO avanzado (meta descripción, palabras clave)
- ✅ Estadísticas detalladas del perfil
- ✅ Edición directa del perfil (sin formularios)
- ✅ Mayor visibilidad en búsquedas
- ✅ Posibilidad de ser place destacado

### Flujo de Suscripción

1. **Registro Inicial**: Todos los places empiezan con plan gratuito
2. **Upgrade a Premium**: 
   - Usuario selecciona plan premium
   - Proceso de pago (Webpay, transferencia)
   - Activación automática tras confirmación de pago
3. **Gestión de Suscripción**:
   - Renovación automática mensual
   - Opción de cancelar en cualquier momento
   - Downgrade automático si no se renueva

### Recursos Digitales Exclusivos

Los miembros premium tienen acceso a:

#### Software y Herramientas
- CRM básico para gestión de clientes
- Herramientas de marketing digital
- Generador de facturas y cotizaciones
- Calendario de citas online

#### Almacenamiento y Backup
- 100GB de almacenamiento en la nube
- Backup automático de datos de place
- Sincronización entre dispositivos

#### Descuentos y Beneficios
- 30% descuento en desarrollo web
- 25% descuento en marketing digital
- 20% descuento en fotografía profesional
- Consultoría gratuita mensual (1 hora)

#### Networking y Comunidad
- Chat entre places exclusivo
- Eventos de networking mensuales
- Directorio de contactos premium
- Oportunidades de colaboración

---

## �📦 Migración desde Supabase

### Script de Migración (Node.js)

**migrate-to-firebase.js**:

```javascript
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function migratePlaces() {
  console.log('Migrando places...');
  
  const { data: places, error } = await supabase
    .from('places')
    .select('*');
  
  if (error) throw error;
  
  const batch = db.batch();
  
  for (const place of places) {
    const docRef = db.collection('places').doc();
    
    const firestoreData = {
      nombre: placeData.nombre,
      slug: placeData.slug,
      descripcion: placeData.descripcion || '',
      categoriaId: placeData.categoria_id,
      barrioId: placeData.barrio_id,
      direccion: placeData.direccion || '',
      telefono: placeData.telefono || null,
      email: placeData.email || null,
      sitioWeb: placeData.sitio_web || null,
      redesSociales: placeData.redes_sociales || {},
      horarios: placeData.horarios || null,
      servicios: placeData.servicios || [],
      coordenadas: placeData.lat && placeData.lng ? {
        lat: placeData.lat,
        lng: placeData.lng
      } : null,
      logoUrl: placeData.logo_url || null,
      destacado: placeData.destacado || false,
      verificado: placeData.verificado || false,
      status: placeData.status || 'pendiente',
      usuarioId: placeData.usuario_id || '',
      createdAt: admin.firestore.Timestamp.fromDate(new Date(placeData.created_at)),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(placeData.updated_at)),
    };
    
    batch.set(docRef, firestoreData);
  }
  
  await batch.commit();
  console.log(`✅ ${places.length} places migradas`);
}

async function migrateCategorias() {
  console.log('Migrando categorías...');
  
  const { data: categorias, error } = await supabase
    .from('categorias')
    .select('*');
  
  if (error) throw error;
  
  const batch = db.batch();
  
  for (const categoria of categorias) {
    const docRef = db.collection('categorias').doc();
    
    const firestoreData = {
      nombre: categoria.nombre,
      slug: categoria.slug,
      descripcion: categoria.descripcion || '',
      icono: categoria.icono || '',
      color: categoria.color || null,
      orden: categoria.orden || 0,
      activa: categoria.activa !== false,
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    batch.set(docRef, firestoreData);
  }
  
  await batch.commit();
  console.log(`✅ ${categorias.length} categorías migradas`);
}

async function migrateBarrios() {
  console.log('Migrando barrios...');
  
  const { data: barrios, error } = await supabase
    .from('barrios')
    .select('*');
  
  if (error) throw error;
  
  const batch = db.batch();
  
  for (const barrio of barrios) {
    const docRef = db.collection('barrios').doc();
    
    const firestoreData = {
      nombre: barrio.nombre,
      slug: barrio.slug,
      codigo: barrio.codigo || null,
      descripcion: barrio.descripcion || '',
      coordenadas: barrio.lat && barrio.lng ? {
        lat: barrio.lat,
        lng: barrio.lng
      } : null,
      tipo: barrio.tipo || 'urbano',
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    batch.set(docRef, firestoreData);
  }
  
  await batch.commit();
  console.log(`✅ ${barrios.length} barrios migrados`);
}

async function migrate() {
  try {
    await migrateCategorias();
    await migrateBarrios();
    await migrateEmpresas();
    console.log('🎉 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

migrate();
```

### Ejecutar Migración

```bash
npm install firebase-admin @supabase/supabase-js

# Configurar variables de entorno
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_key

# Ejecutar
node migrate-to-firebase.js
```

---

## 🔧 Operaciones Comunes

### Crear Documento (Backend NestJS)

```typescript
const firestore = this.firebaseService.getFirestore();

const placeData = {
  nombre: 'Nueva Empresa',
  slug: 'nuevo-place',
  status: 'pendiente',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

const docRef = await firestore.collection('places').add(placeData);
  console.log('Place creado con ID:', docRef.id);
```

### Datos Iniciales de Planes y Recursos

**crear-planes-iniciales.js**:

```javascript
const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function crearPlanesIniciales() {
  console.log('Creando planes iniciales...');
  
  const planes = [
    {
      id: 'gratuito',
      nombre: 'Plan Gratuito',
      descripcion: 'Perfil básico para empezar a promocionar tu place',
      precio: 0,
      currency: 'CLP',
      duracion: 0, // Ilimitado
      caracteristicas: [
        'Perfil básico de place',
        'Información de contacto completa',
        'Hasta 3 redes sociales personalizables',
        'Logo y descripción',
        'Ubicación en mapa interactivo',
        'Horarios de atención'
      ],
      limites: {
        maxRedesSociales: 3,
        galeria: false,
        video: false,
        chat: false,
        seo: false,
        estadisticas: false,
        destacado: false,
        equipo: false,
        certificaciones: false
      },
      beneficios: [
        'Perfil público visible',
        'Aparece en búsquedas',
        'Contacto directo con clientes'
      ],
      popular: false,
      activo: true,
      orden: 1,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      id: 'premium',
      nombre: 'Plan Premium',
      descripcion: 'Perfil completo con herramientas avanzadas y recursos exclusivos',
      precio: 19990,
      currency: 'CLP',
      duracion: 30, // 30 días
      caracteristicas: [
        'Todas las características del plan gratuito',
        'Galería de imágenes (hasta 10 fotos)',
        'Video promocional',
        'Información completa de place',
        'Perfil de equipo',
        'Certificaciones y reconocimientos',
        'Chat entre places exclusivo',
        'Recursos digitales premium',
        'SEO avanzado',
        'Estadísticas detalladas',
        'Edición directa del perfil',
        'Mayor visibilidad'
      ],
      limites: {
        maxRedesSociales: 3,
        galeria: true,
        video: true,
        chat: true,
        seo: true,
        estadisticas: true,
        destacado: true,
        equipo: true,
        certificaciones: true
      },
      beneficios: [
        'Máxima visibilidad en búsquedas',
        'Perfil profesional completo',
        'Herramientas de marketing',
        '100GB almacenamiento en la nube',
        'Descuentos en servicios',
        'Consultoría mensual gratuita',
        'Networking de places',
        'Soporte prioritario'
      ],
      popular: true,
      activo: true,
      orden: 2,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }
  ];
  
  const batch = db.batch();
  
  for (const plan of planes) {
    const docRef = db.collection('planes').doc(plan.id);
    batch.set(docRef, plan);
  }
  
  await batch.commit();
  console.log(`✅ ${planes.length} planes creados`);
}

async function main() {
  try {
    await crearPlanesIniciales();
    console.log('🎉 Configuración inicial completada');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
```

### Leer Documentos con Filtros

```typescript
const snapshot = await firestore
  .collection('places')
  .where('status', '==', 'aprobado')
  .where('categoriaId', '==', 'cat-123')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

const places = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
```

### Actualizar Documento

```typescript
await firestore
  .collection('places')
  .doc(placeId)
  .update({
    nombre: 'Nombre Actualizado',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
```

### Eliminar Documento

```typescript
await firestore
  .collection('places')
  .doc(placeId)
  .delete();
```

### Transacciones

```typescript
const docRef = firestore.collection('places').doc(placeId);

await firestore.runTransaction(async (transaction) => {
  const doc = await transaction.get(docRef);
  
  if (!doc.exists) {
    throw new Error('Empresa no encontrada');
  }
  
  transaction.update(docRef, {
    destacado: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
```

---

## 🎯 Best Practices

### 1. Denormalización Estratégica

✅ **Recomendado**: Duplicar datos frecuentemente leídos
```typescript
// En lugar de solo guardar categoriaId
{
  categoriaId: 'cat-123',
  categoriaNombre: 'Restaurantes', // Duplicado para evitar JOIN
  categoriaSlug: 'restaurantes'
}
```

### 2. Paginación con Cursors

```typescript
// Primera página
let query = firestore
  .collection('places')
  .orderBy('createdAt', 'desc')
  .limit(20);

const snapshot = await query.get();

// Siguiente página
const lastVisible = snapshot.docs[snapshot.docs.length - 1];
query = query.startAfter(lastVisible);
```

### 3. Batch Writes

```typescript
const batch = firestore.batch();

places.forEach(place => {
  const docRef = firestore.collection('places').doc();
  batch.set(docRef, placeData);
});

// Commit todas las operaciones
await batch.commit(); // Max 500 operaciones
```

### 4. Seguridad

- ✅ **SIEMPRE** validar datos en backend antes de escribir
- ✅ Usar reglas de seguridad estrictas
- ✅ No confiar en client-side validation
- ❌ **NUNCA** exponer credenciales de Admin SDK en frontend

### 5. Performance

- ✅ Crear índices para queries frecuentes
- ✅ Limitar resultados de queries (usar `limit()`)
- ✅ Usar `select()` para traer solo campos necesarios
- ❌ Evitar queries con `!=` y `not-in` (requieren escaneo completo)

---

## 📊 Monitoreo y Análisis

### Firebase Console
1. Ir a "Firestore Database" > "Uso"
2. Monitorear:
   - Lecturas/Escrituras por día
   - Tamaño de almacenamiento
   - Queries lentas

### Alertas
1. Ir a "Monitoreo y alertas"
2. Configurar alertas para:
   - Exceso de lecturas/escrituras
   - Errors rate alto
   - Latencia alta

---

## 📝 Checklist

### Setup Inicial
- [ ] Crear proyecto Firebase
- [ ] Habilitar Firestore Database
- [ ] Habilitar Authentication
- [ ] Habilitar Storage
- [ ] Obtener credenciales Web SDK
- [ ] Obtener credenciales Admin SDK

### Configuración
- [ ] Crear colecciones base
- [ ] Implementar reglas de seguridad Firestore
- [ ] Implementar reglas de seguridad Storage
- [ ] Crear índices compuestos
- [ ] Deploy reglas y índices

### Migración
- [ ] Exportar datos de Supabase
- [ ] Script de migración
- [ ] Validar datos migrados
- [ ] Testing completo

### Producción
- [ ] Configurar backups automáticos
- [ ] Configurar alertas de monitoreo
- [ ] Documentar estructura de datos
- [ ] Plan de contingencia

---

**Versión**: 1.0  
**Última actualización**: 2025-11-06
