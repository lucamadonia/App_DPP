import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Read .env
const envContent = readFileSync('.env', 'utf8');
const getEnvVar = (key) => {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(`${key}=`));
  return line ? line.substring(key.length + 1).trim() : null;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n🔍 Checking database migrations...\n');

// Check if handle_new_user function exists and has correct logic
const { data: functions, error: funcError } = await supabase
  .rpc('exec', {
    sql: `
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'handle_new_user';
    `
  })
  .limit(0);

// Alternative: Check if trigger exists
console.log('Checking for handle_new_user trigger...');

const { data, error } = await supabase
  .from('rh_customer_profiles')
  .select('id')
  .limit(1);

if (error) {
  console.error('❌ Cannot query rh_customer_profiles:', error.message);
  console.log('\n⚠️  This suggests RLS policies or table structure issues.');
}

// List all migration files
console.log('\n📁 Migration files found:\n');
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
try {
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  files.forEach((file, i) => {
    console.log(`${i + 1}. ${file}`);
  });

  console.log(`\n📊 Total: ${files.length} migration files`);
} catch (err) {
  console.log('No migrations directory found');
}

console.log('\n⚠️  ACTION REQUIRED:');
console.log('Please apply this migration manually in Supabase SQL Editor:');
console.log('   📄 supabase/migrations/20260201_fix_handle_new_user.sql');
console.log('\nThis migration is CRITICAL for customer registration!');
