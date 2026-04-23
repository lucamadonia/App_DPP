/**
 * Legt initiale Feature-Flags an, die im Admin-UI vorbelegt erscheinen sollen.
 * Idempotent — vorhandene Flags werden nicht überschrieben.
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const INITIAL_FLAGS = [
  { key: 'ai_compliance_v2', description: 'Neue KI-basierte Compliance-Prüfung mit Claude Opus 4.7' },
  { key: 'new_email_editor', description: 'Überarbeiteter Email-Template-Editor mit Block-Editor' },
  { key: 'crm_dashboard_v2', description: 'CRM Dashboard mit Lifecycle-Funnel + Health-Score' },
  { key: 'whitelabel_self_service', description: 'Tenants können eigene Subdomain + SMTP selbst konfigurieren' },
  { key: 'advanced_analytics', description: 'Erweiterte Analytics: Cohort, Churn, Predictive CLV' },
  { key: 'shopify_inventory_bidirectional', description: 'Bidirektionaler Shopify Inventory-Sync mit Webhook' },
];

async function main() {
  const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  for (const flag of INITIAL_FLAGS) {
    const existing = await fetch(`${SUPABASE_URL}/rest/v1/admin_feature_flags?key=eq.${flag.key}&select=key`, { headers: H });
    const rows = await existing.json();
    if (rows.length > 0) {
      console.log(`  ~ skipping ${flag.key} (already exists)`);
      continue;
    }
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/admin_feature_flags`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({
        key: flag.key,
        description: flag.description,
        enabled_globally: false,
        rollout_percentage: 0,
      }),
    });
    if (ins.ok) console.log(`  + created ${flag.key}`);
    else console.error(`  ! failed ${flag.key}:`, await ins.text());
  }
  console.log('\nFertig. Admin-UI: /admin/feature-flags');
}

await main();
