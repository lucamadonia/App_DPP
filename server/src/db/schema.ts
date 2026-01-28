import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, varchar, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== TENANTS (Mandanten) ====================
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),

  // Company Info
  companyName: varchar('company_name', { length: 255 }),
  eoriNumber: varchar('eori_number', { length: 50 }),
  vatNumber: varchar('vat_number', { length: 50 }),
  street: varchar('street', { length: 255 }),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),

  // Responsible Person (EU regulation)
  responsiblePersonName: varchar('responsible_person_name', { length: 255 }),
  responsiblePersonEmail: varchar('responsible_person_email', { length: 255 }),
  responsiblePersonPhone: varchar('responsible_person_phone', { length: 50 }),

  // Branding
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),

  // Subscription
  plan: varchar('plan', { length: 50 }).default('free'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== USERS ====================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('viewer').notNull(), // admin, editor, viewer

  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== API KEYS ====================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(), // für Anzeige: "dpp_live_sk_...7x9a"

  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== PRODUCTS ====================
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  internalId: varchar('internal_id', { length: 100 }),
  gtin: varchar('gtin', { length: 14 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  category: varchar('category', { length: 255 }),
  description: text('description'),
  imageUrl: text('image_url'),

  // Status
  status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, published, archived
  complianceScore: integer('compliance_score').default(0),

  // Dates
  productionDate: timestamp('production_date'),
  expirationDate: timestamp('expiration_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
});

// ==================== MATERIALS ====================
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
  recyclable: boolean('recyclable').default(false),
  origin: varchar('origin', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== CERTIFICATIONS ====================
export const certifications = pgTable('certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  issuedBy: varchar('issued_by', { length: 255 }),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  documentUrl: text('document_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== CARBON FOOTPRINT ====================
export const carbonFootprints = pgTable('carbon_footprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  totalKgCO2: decimal('total_kg_co2', { precision: 10, scale: 2 }),
  productionKgCO2: decimal('production_kg_co2', { precision: 10, scale: 2 }),
  transportKgCO2: decimal('transport_kg_co2', { precision: 10, scale: 2 }),
  rating: varchar('rating', { length: 1 }), // A, B, C, D, E

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== RECYCLABILITY ====================
export const recyclability = pgTable('recyclability', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  recyclablePercentage: integer('recyclable_percentage').default(0),
  instructions: text('instructions'),
  disposalMethods: jsonb('disposal_methods').$type<string[]>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== SUPPLY CHAIN ====================
export const supplyChainEntries = pgTable('supply_chain_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  step: integer('step').notNull(),
  location: varchar('location', { length: 255 }),
  country: varchar('country', { length: 100 }),
  date: timestamp('date'),
  description: text('description'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== DOCUMENTS ====================
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  productId: uuid('product_id').references(() => products.id),

  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }),
  fileSize: integer('file_size'),
  fileUrl: text('file_url').notNull(),

  category: varchar('category', { length: 100 }), // certificate, report, datasheet
  validUntil: timestamp('valid_until'),

  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== AUDIT LOG ====================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }), // product, document, user
  entityId: uuid('entity_id'),
  details: jsonb('details'),

  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== DPP ACCESS LOG ====================
export const dppAccessLogs = pgTable('dpp_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),

  accessedAt: timestamp('accessed_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  country: varchar('country', { length: 100 }),
});

// ==================== RELATIONS ====================
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  documents: many(documents),
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  materials: many(materials),
  certifications: many(certifications),
  carbonFootprint: one(carbonFootprints),
  recyclability: one(recyclability),
  supplyChain: many(supplyChainEntries),
  documents: many(documents),
  accessLogs: many(dppAccessLogs),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  product: one(products, {
    fields: [materials.productId],
    references: [products.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  product: one(products, {
    fields: [certifications.productId],
    references: [products.id],
  }),
}));
