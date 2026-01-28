import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import jwt from 'jsonwebtoken';
import { db, users, tenants, apiKeys } from '../db';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    tenantId: string;
  }
}

// JWT Token erstellen
export function createToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// JWT Token verifizieren
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Auth Middleware
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new HTTPException(401, { message: 'No authorization header' });
  }

  const [type, token] = authHeader.split(' ');

  // Bearer Token (JWT)
  if (type === 'Bearer' && token) {
    const payload = verifyToken(token);
    if (!payload) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }

    // User aus DB laden
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(and(eq(users.id, payload.id), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      throw new HTTPException(401, { message: 'User not found or inactive' });
    }

    c.set('user', {
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
    c.set('tenantId', user.tenantId);

    await next();
    return;
  }

  throw new HTTPException(401, { message: 'Invalid authorization format' });
}

// API Key Auth Middleware
export async function apiKeyMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const apiKeyHeader = c.req.header('X-API-Key');

  const key = apiKeyHeader || (authHeader?.startsWith('Bearer dpp_') ? authHeader.slice(7) : null);

  if (!key) {
    throw new HTTPException(401, { message: 'No API key provided' });
  }

  // API Key hashen und vergleichen
  const keyPrefix = key.slice(0, 15);
  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      tenantId: apiKeys.tenantId,
      name: apiKeys.name,
      keyHash: apiKeys.keyHash,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, keyPrefix))
    .limit(1);

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  // Key verifizieren
  const isValid = await bcrypt.compare(key, apiKey.keyHash);
  if (!isValid) {
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  // Last used aktualisieren
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  c.set('tenantId', apiKey.tenantId);

  await next();
}

// Role Check Middleware
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }
    await next();
  };
}
