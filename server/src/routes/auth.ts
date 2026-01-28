import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db, users, tenants } from '../db';
import { eq } from 'drizzle-orm';
import { createToken } from '../middleware/auth';
import { nanoid } from 'nanoid';

const app = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  companyName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register - Neuen Tenant + Admin User erstellen
app.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');

  // Check if email exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing) {
    return c.json({ error: 'Email already registered' }, 400);
  }

  // Create tenant
  const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + nanoid(6);
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: data.companyName,
      slug,
      companyName: data.companyName,
    })
    .returning();

  // Create admin user
  const passwordHash = await bcrypt.hash(data.password, 12);
  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'admin',
    })
    .returning();

  const token = createToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
  }, 201);
});

// POST /auth/login
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const data = c.req.valid('json');

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      passwordHash: users.passwordHash,
      tenantId: users.tenantId,
      isActive: users.isActive,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.email, data.email))
    .limit(1);

  if (!user || !user.isActive) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const token = createToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: {
      id: user.tenantId,
      name: user.tenantName,
      slug: user.tenantSlug,
    },
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant: {
      id: user.tenantId,
      name: user.tenantName,
      slug: user.tenantSlug,
    },
  });
});

// GET /auth/me - Aktueller User
app.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  return c.json({ user });
});

export default app;
