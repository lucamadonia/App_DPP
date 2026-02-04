import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const getEnvVar = (key) => {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(`${key}=`));
  return line ? line.substring(key.length + 1).trim() : null;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { data: tenants } = await supabase
  .from('tenants')
  .select('id, name, slug')
  .limit(5);

console.log('\n📋 Ihre Tenants:\n');
tenants?.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name}`);
  console.log(`   Slug: ${t.slug}`);
  console.log(`   ID: ${t.id}`);
  console.log(`   Customer Portal URL: https://dpp-app.fambliss.eu/customer/${t.slug}/register`);
  console.log('');
});
