# Especificación de Base de Datos - MongoDB / Mongoose

Esta especificación detalla las colecciones y esquemas de Mongoose que se implementarán en la base de datos de MongoDB.

---

## 🗄️ Colecciones de Base de Datos

Definiremos 5 colecciones independientes para el contenido y una colección para control de roles (si es necesaria en el futuro).

### 1. Colección: `restaurants`
Almacena la información de los restaurantes latinos en Ginebra.

* **Esquema Mongoose:**
```typescript
{
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  neighborhood: { type: String, required: true }, // Ej: Plainpalais, Pâquis
  phone: { type: String },
  website: { type: String },
  instagram: { type: String },
  logoUrl: { type: String },
  coverUrl: { type: String },
  ownerId: { type: String, default: null }, // Firebase UID para V2
}
```

### 2. Colección: `events`
Almacena conciertos, ferias de barrio (*Vide-Greniers*), días nacionales y fiestas.

* **Esquema Mongoose:**
```typescript
{
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  location: { type: String, required: true },
  neighborhood: { type: String },
  price: { type: Number, default: 0 }, // Precio en CHF (0 = gratis)
  imageUrl: { type: String },
  organizerName: { type: String },
  ownerId: { type: String, default: null },
}
```

### 3. Colección: `jobs`
Almacena anuncios de empleo de la comunidad.

* **Esquema Mongoose:**
```typescript
{
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String },
  salary: { type: String, default: "A convenir" },
  jobType: { type: String, enum: ["Full-time", "Part-time", "Temporal"], required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String },
  ownerId: { type: String, default: null },
}
```

### 4. Colección: `services`
Servicios de reparación, salud, etc.

* **Esquema Mongoose:**
```typescript
{
  title: { type: String, required: true },
  category: { type: String, enum: ["salud", "reparacion", "tramites", "otros"], required: true },
  description: { type: String, required: true },
  contactName: { type: String },
  phone: { type: String, required: true },
  email: { type: String },
  website: { type: String },
  imageUrl: { type: String },
  ownerId: { type: String, default: null },
}
```

### 5. Colección: `media`
Artículos, podcasts, videos, libros o películas de interés cultural.

* **Esquema Mongoose:**
```typescript
{
  title: { type: String, required: true },
  type: { type: String, enum: ["podcast", "video", "article", "book", "movie"], required: true },
  category: { type: String }, // cultura, politica, musica
  description: { type: String },
  contentUrl: { type: String, required: true }, // Enlace externo
  embedUrl: { type: String }, // Iframe embed code/URL
  author: { type: String },
  imageUrl: { type: String },
  publishedAt: { type: Date, default: Date.now },
}
```

---

## 📈 Índices y Rendimiento
* Índice en `neighborhood` para optimizar búsquedas por barrios.
* Índice de texto en `name` y `description` para habilitar el motor de búsqueda interno en el portal.
