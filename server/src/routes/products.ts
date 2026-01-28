import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, products, materials, certifications, carbonFootprints, recyclability, supplyChainEntries, auditLogs } from '../db';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const app = new Hono();

// Validation Schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  internalId: z.string().optional(),
  gtin: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  productionDate: z.string().optional(),
  materials: z.array(z.object({
    name: z.string(),
    percentage: z.number(),
    recyclable: z.boolean().optional(),
    origin: z.string().optional(),
  })).optional(),
});

const updateProductSchema = createProductSchema.partial();

// GET /products - Liste aller Produkte (gefiltert nach Tenant)
app.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { search, status, limit = '50', offset = '0' } = c.req.query();

  let query = db
    .select()
    .from(products)
    .where(eq(products.tenantId, tenantId))
    .orderBy(desc(products.updatedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Filter anwenden
  const conditions = [eq(products.tenantId, tenantId)];

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.gtin, `%${search}%`),
        ilike(products.internalId, `%${search}%`)
      )!
    );
  }

  if (status) {
    conditions.push(eq(products.status, status));
  }

  const result = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.updatedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  return c.json({ data: result, total: result.length });
});

// GET /products/:id - Einzelnes Produkt mit allen Details
app.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Alle zugehörigen Daten laden
  const [productMaterials, productCerts, productCarbon, productRecycling, productSupplyChain] = await Promise.all([
    db.select().from(materials).where(eq(materials.productId, id)),
    db.select().from(certifications).where(eq(certifications.productId, id)),
    db.select().from(carbonFootprints).where(eq(carbonFootprints.productId, id)).limit(1),
    db.select().from(recyclability).where(eq(recyclability.productId, id)).limit(1),
    db.select().from(supplyChainEntries).where(eq(supplyChainEntries.productId, id)).orderBy(supplyChainEntries.step),
  ]);

  return c.json({
    ...product,
    materials: productMaterials,
    certifications: productCerts,
    carbonFootprint: productCarbon[0] || null,
    recyclability: productRecycling[0] || null,
    supplyChain: productSupplyChain,
  });
});

// POST /products - Neues Produkt erstellen
app.post('/', zValidator('json', createProductSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const data = c.req.valid('json');

  const internalId = data.internalId || `PRD-${nanoid(8).toUpperCase()}`;

  const [product] = await db
    .insert(products)
    .values({
      tenantId,
      name: data.name,
      internalId,
      gtin: data.gtin,
      serialNumber: data.serialNumber,
      category: data.category,
      description: data.description,
      productionDate: data.productionDate ? new Date(data.productionDate) : undefined,
      status: 'draft',
    })
    .returning();

  // Materialien hinzufügen
  if (data.materials && data.materials.length > 0) {
    await db.insert(materials).values(
      data.materials.map((m) => ({
        productId: product.id,
        name: m.name,
        percentage: m.percentage.toString(),
        recyclable: m.recyclable,
        origin: m.origin,
      }))
    );
  }

  // Audit Log
  await db.insert(auditLogs).values({
    tenantId,
    userId: user?.id,
    action: 'product.created',
    entityType: 'product',
    entityId: product.id,
    details: { name: product.name },
  });

  return c.json(product, 201);
});

// PUT /products/:id - Produkt aktualisieren
app.put('/:id', zValidator('json', updateProductSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const [product] = await db
    .update(products)
    .set({
      ...data,
      productionDate: data.productionDate ? new Date(data.productionDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  // Audit Log
  await db.insert(auditLogs).values({
    tenantId,
    userId: user?.id,
    action: 'product.updated',
    entityType: 'product',
    entityId: product.id,
    details: { changes: data },
  });

  return c.json(product);
});

// DELETE /products/:id - Produkt löschen
app.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const { id } = c.req.param();

  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Cascade delete
  await Promise.all([
    db.delete(materials).where(eq(materials.productId, id)),
    db.delete(certifications).where(eq(certifications.productId, id)),
    db.delete(carbonFootprints).where(eq(carbonFootprints.productId, id)),
    db.delete(recyclability).where(eq(recyclability.productId, id)),
    db.delete(supplyChainEntries).where(eq(supplyChainEntries.productId, id)),
  ]);

  await db.delete(products).where(eq(products.id, id));

  // Audit Log
  await db.insert(auditLogs).values({
    tenantId,
    userId: user?.id,
    action: 'product.deleted',
    entityType: 'product',
    entityId: id,
    details: { name: existing.name },
  });

  return c.json({ success: true });
});

// POST /products/:id/publish - Produkt veröffentlichen
app.post('/:id/publish', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const { id } = c.req.param();

  const [product] = await db
    .update(products)
    .set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .returning();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Audit Log
  await db.insert(auditLogs).values({
    tenantId,
    userId: user?.id,
    action: 'product.published',
    entityType: 'product',
    entityId: id,
  });

  return c.json(product);
});

export default app;
