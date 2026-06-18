# Rol: Especialista en Base de Datos (`database-skill.spec.md`)

Esta especificación detalla las tablas de PostgreSQL (Supabase) que se implementarán utilizando **Drizzle ORM** para definir los esquemas y las migraciones.

---

## 🗄️ Esquemas de Tablas (Drizzle ORM)

Estructuraremos tablas especializadas utilizando TypeScript y Drizzle.

### 1. Tabla: `restaurants`
```typescript
import { pgTable, uuid, varchar, text, timestamp, doublePrecision, integer } from 'drizzle-orm/pg-core';

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  neighborhood: varchar('neighborhood', { length: 100 }).notNull(), // ej. Plainpalais
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  instagram: varchar('instagram', { length: 255 }),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  clicks: integer('clicks').default(0).notNull(), // Tracking
  ownerId: uuid('owner_id'), // Supabase Auth User ID (V2)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 2. Tabla: `events`
```typescript
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  date: timestamp('date').notNull(),
  endDate: timestamp('end_date'),
  location: varchar('location', { length: 255 }).notNull(),
  neighborhood: varchar('neighborhood', { length: 100 }),
  price: doublePrecision('price').default(0).notNull(), // CHF (0 = gratis)
  imageUrl: text('image_url'),
  organizerName: varchar('organizer_name', { length: 255 }),
  clicks: integer('clicks').default(0).notNull(), // Tracking
  ownerId: uuid('owner_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 3. Tabla: `jobs`
```typescript
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  salary: varchar('salary', { length: 100 }).default('A convenir'),
  jobType: varchar('job_type', { length: 50 }).notNull(), // Full-time, Part-time, etc.
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }),
  clicks: integer('clicks').default(0).notNull(), // Tracking
  ownerId: uuid('owner_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 4. Tabla: `services`
```typescript
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // salud, reparacion, etc.
  description: text('description').notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  imageUrl: text('image_url'),
  clicks: integer('clicks').default(0).notNull(), // Tracking
  ownerId: uuid('owner_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 5. Tabla: `media`
```typescript
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // podcast, video, article
  category: varchar('category', { length: 100 }), // cultura, politica, musica
  description: text('description'),
  contentUrl: text('content_url').notNull(),
  embedUrl: text('embed_url'),
  author: varchar('author', { length: 255 }),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 📈 Índices de Rendimiento (PostgreSQL)
*   Índices en las columnas `neighborhood` de `restaurants` y `events` para optimizar filtrados geográficos de Ginebra.
*   Índices B-Tree en `ownerId` para acelerar las consultas de perfiles de usuario en la V2.
