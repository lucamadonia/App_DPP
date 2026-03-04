import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const tenantId = '616002b0-5de8-4a86-b59d-de53aef0f406';

// 1. Get current settings
const tenantResp = await fetch(`${url}/rest/v1/tenants?id=eq.${tenantId}&select=settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const [tenant] = await tenantResp.json();
const currentSettings = tenant?.settings || {};
const warehouse = currentSettings.warehouse || {};

const dhlSettings = {
  enabled: true,
  sandbox: true,
  apiKey: '3KtNgSkuR97vUF3mVtFtQs48Di7xYgCN',
  username: 'user-valid',
  password: 'SandboxPasswort2023!',
  billingNumber: '33333333330102',
  defaultProduct: 'V01PAK',
  labelFormat: 'PDF_A4',
  shipper: {
    name1: 'MyFambliss GmbH',
    name2: 'Abt. Versand',
    addressStreet: 'Beim Steinernen Kreuz 19',
    postalCode: '79112',
    city: 'Freiburg',
    country: 'DEU',
    email: 'info@fambliss.de',
    phone: '+49 30 12345678',
  },
  connectedAt: new Date().toISOString(),
};

const newSettings = {
  ...currentSettings,
  warehouse: { ...warehouse, dhl: dhlSettings },
};

// 2. Update
const resp = await fetch(`${url}/rest/v1/tenants?id=eq.${tenantId}`, {
  method: 'PATCH',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ settings: newSettings }),
});
const result = await resp.json();
const saved = result[0]?.settings?.warehouse?.dhl;
console.log('DHL settings saved:', JSON.stringify({
  enabled: saved?.enabled,
  sandbox: saved?.sandbox,
  hasApiKey: !!saved?.apiKey,
  hasUsername: !!saved?.username,
  hasPassword: !!saved?.password,
  billingNumber: saved?.billingNumber,
  shipperName: saved?.shipper?.name1,
  connectedAt: saved?.connectedAt,
}, null, 2));
