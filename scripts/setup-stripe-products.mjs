/**
 * Setup Stripe Products & Prices
 *
 * Creates all Trackbliss products and prices in Stripe:
 * - 2 Plan products (Pro, Enterprise) with monthly + yearly prices
 * - 6 Module products with monthly prices
 * - 3 Credit Pack products with one-time prices
 *
 * Run: node scripts/setup-stripe-products.mjs
 *
 * Outputs a JSON config with all price IDs to paste into
 * src/config/stripe-prices.ts
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
function loadDotenv() {
  const envPath = resolve(__dirname, '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotenv();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY not found in .env');
  process.exit(1);
}

// Stripe API helper
async function stripeRequest(endpoint, body) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(flatten(body)).toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Stripe API Error: ${data.error.message}`);
  }
  return data;
}

// Flatten nested objects for URL encoding (Stripe format)
function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}[${key}]` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

// ============================================
// PRODUCT DEFINITIONS
// ============================================

const PLANS = [
  {
    id: 'pro',
    name: { en: 'Trackbliss Pro', de: 'Trackbliss Pro' },
    description: {
      en: 'Professional plan — 50 products, 25 AI credits/month, all 11 DPP templates',
      de: 'Professioneller Plan — 50 Produkte, 25 AI-Credits/Monat, alle 11 DPP-Templates',
    },
    monthlyPriceCents: 4900,
    yearlyPriceCents: 46800, // €468/yr = €39/mo
    metadata: { trackbliss_plan: 'pro' },
  },
  {
    id: 'enterprise',
    name: { en: 'Trackbliss Enterprise', de: 'Trackbliss Enterprise' },
    description: {
      en: 'Enterprise plan — Unlimited products, 100 AI credits/month, white-label, custom CSS',
      de: 'Enterprise-Plan — Unbegrenzte Produkte, 100 AI-Credits/Monat, White-Label, Custom CSS',
    },
    monthlyPriceCents: 14900,
    yearlyPriceCents: 142800, // €1428/yr = €119/mo
    metadata: { trackbliss_plan: 'enterprise' },
  },
];

const MODULES = [
  {
    id: 'returns_hub_starter',
    name: { en: 'Returns Hub Starter', de: 'Returns Hub Starter' },
    description: {
      en: '50 returns/month, 5 standard email templates',
      de: '50 Retouren/Monat, 5 Standard-E-Mail-Vorlagen',
    },
    monthlyPriceCents: 2900,
    metadata: { trackbliss_module: 'returns_hub_starter' },
  },
  {
    id: 'returns_hub_professional',
    name: { en: 'Returns Hub Professional', de: 'Returns Hub Professional' },
    description: {
      en: '300 returns/month, tickets, all email templates, 5 workflow rules, read-only API',
      de: '300 Retouren/Monat, Tickets, alle E-Mail-Vorlagen, 5 Workflow-Regeln, Lese-API',
    },
    monthlyPriceCents: 6900,
    metadata: { trackbliss_module: 'returns_hub_professional' },
  },
  {
    id: 'returns_hub_business',
    name: { en: 'Returns Hub Business', de: 'Returns Hub Business' },
    description: {
      en: 'Unlimited returns, webhooks, full API access, unlimited workflows',
      de: 'Unbegrenzte Retouren, Webhooks, voller API-Zugriff, unbegrenzte Workflows',
    },
    monthlyPriceCents: 14900,
    metadata: { trackbliss_module: 'returns_hub_business' },
  },
  {
    id: 'supplier_portal',
    name: { en: 'Supplier Portal', de: 'Lieferantenportal' },
    description: {
      en: 'Invite suppliers to self-register and manage their data',
      de: 'Lieferanten zur Selbstregistrierung und Datenverwaltung einladen',
    },
    monthlyPriceCents: 1900,
    metadata: { trackbliss_module: 'supplier_portal' },
  },
  {
    id: 'customer_portal',
    name: { en: 'Customer Portal', de: 'Kundenportal' },
    description: {
      en: 'Self-service portal for customers — returns, tickets, profile',
      de: 'Self-Service-Portal für Kunden — Retouren, Tickets, Profil',
    },
    monthlyPriceCents: 2900,
    metadata: { trackbliss_module: 'customer_portal' },
  },
  {
    id: 'custom_domain',
    name: { en: 'Custom Domain / White-Label', de: 'Custom Domain / White-Label' },
    description: {
      en: 'Serve your portal under your own domain with full white-label branding',
      de: 'Portal unter eigener Domain mit vollem White-Label-Branding bereitstellen',
    },
    monthlyPriceCents: 1900,
    metadata: { trackbliss_module: 'custom_domain' },
  },
];

const CREDIT_PACKS = [
  {
    id: 'credits_small',
    name: { en: '50 AI Credits', de: '50 AI-Credits' },
    description: {
      en: '50 AI credits for compliance checks and analysis — never expire',
      de: '50 AI-Credits für Compliance-Prüfungen und Analysen — verfallen nie',
    },
    priceCents: 900,
    metadata: { trackbliss_credits: '50', trackbliss_credit_pack: 'small' },
  },
  {
    id: 'credits_medium',
    name: { en: '200 AI Credits', de: '200 AI-Credits' },
    description: {
      en: '200 AI credits for compliance checks and analysis — never expire',
      de: '200 AI-Credits für Compliance-Prüfungen und Analysen — verfallen nie',
    },
    priceCents: 2900,
    metadata: { trackbliss_credits: '200', trackbliss_credit_pack: 'medium' },
  },
  {
    id: 'credits_large',
    name: { en: '500 AI Credits', de: '500 AI-Credits' },
    description: {
      en: '500 AI credits for compliance checks and analysis — never expire',
      de: '500 AI-Credits für Compliance-Prüfungen und Analysen — verfallen nie',
    },
    priceCents: 5900,
    metadata: { trackbliss_credits: '500', trackbliss_credit_pack: 'large' },
  },
];

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('Setting up Stripe products and prices...\n');

  const result = {
    plans: {},
    modules: {},
    creditPacks: {},
  };

  // 1. Create Plan products + prices
  console.log('=== PLANS ===');
  for (const plan of PLANS) {
    console.log(`\nCreating product: ${plan.name.en}...`);

    const product = await stripeRequest('products', {
      name: plan.name.en,
      description: plan.description.en,
      metadata: {
        ...plan.metadata,
        name_de: plan.name.de,
        description_de: plan.description.de,
      },
    });

    console.log(`  Product ID: ${product.id}`);

    // Monthly price
    const monthlyPrice = await stripeRequest('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: String(plan.monthlyPriceCents),
      recurring: { interval: 'month' },
      metadata: {
        ...plan.metadata,
        interval: 'monthly',
      },
    });

    console.log(`  Monthly Price ID: ${monthlyPrice.id} (€${plan.monthlyPriceCents / 100}/mo)`);

    // Yearly price
    const yearlyPrice = await stripeRequest('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: String(plan.yearlyPriceCents),
      recurring: { interval: 'year' },
      metadata: {
        ...plan.metadata,
        interval: 'yearly',
      },
    });

    console.log(`  Yearly Price ID: ${yearlyPrice.id} (€${plan.yearlyPriceCents / 100}/yr)`);

    result.plans[plan.id] = {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      yearlyPriceId: yearlyPrice.id,
    };
  }

  // 2. Create Module products + prices
  console.log('\n=== MODULES ===');
  for (const mod of MODULES) {
    console.log(`\nCreating product: ${mod.name.en}...`);

    const product = await stripeRequest('products', {
      name: mod.name.en,
      description: mod.description.en,
      metadata: {
        ...mod.metadata,
        name_de: mod.name.de,
        description_de: mod.description.de,
      },
    });

    console.log(`  Product ID: ${product.id}`);

    const price = await stripeRequest('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: String(mod.monthlyPriceCents),
      recurring: { interval: 'month' },
      metadata: mod.metadata,
    });

    console.log(`  Price ID: ${price.id} (€${mod.monthlyPriceCents / 100}/mo)`);

    result.modules[mod.id] = {
      productId: product.id,
      priceId: price.id,
    };
  }

  // 3. Create Credit Pack products + prices
  console.log('\n=== CREDIT PACKS ===');
  for (const pack of CREDIT_PACKS) {
    console.log(`\nCreating product: ${pack.name.en}...`);

    const product = await stripeRequest('products', {
      name: pack.name.en,
      description: pack.description.en,
      metadata: {
        ...pack.metadata,
        name_de: pack.name.de,
        description_de: pack.description.de,
      },
    });

    console.log(`  Product ID: ${product.id}`);

    const price = await stripeRequest('prices', {
      product: product.id,
      currency: 'eur',
      unit_amount: String(pack.priceCents),
      metadata: pack.metadata,
    });

    console.log(`  Price ID: ${price.id} (€${pack.priceCents / 100})`);

    result.creditPacks[pack.id] = {
      productId: product.id,
      priceId: price.id,
    };
  }

  // Output config
  console.log('\n\n========================================');
  console.log('STRIPE PRICE CONFIGURATION');
  console.log('========================================\n');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n\nCopy the config above into src/config/stripe-prices.ts');
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
