import { pgTable, uuid, varchar, text, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';

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
  featured: boolean('featured').default(false).notNull(),
  reviewed: boolean('reviewed').default(false).notNull(),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  stars: integer('stars'),
  isLike: boolean('is_like').default(false).notNull(),
  isDislike: boolean('is_dislike').default(false).notNull(),
  voterId: varchar('voter_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  entityId: uuid('entity_id').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id'),
  entityId: uuid('entity_id').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  reason: varchar('reason', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  author: text('author'),
  authorAvatar: text('author_avatar'),
  sourceName: text('source_name'),
  sourceUrl: text('source_url'),
  category: text('category').default('noticia'),
  status: text('status').default('published'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  featured: boolean('featured').default(false),
  orderPriority: integer('order_priority').default(0),
  coverImage: text('cover_image'),
  content: text('content'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

