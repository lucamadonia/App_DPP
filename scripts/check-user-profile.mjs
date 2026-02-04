import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split(/\r?\n/);

const getEnvVar = (key) => {
  const line = envLines.find(l => l.startsWith(`${key}=`));
  return line ? line.substring(key.length + 1).trim() : null;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const userEmail = 'luca@madonia-freiburg.de';

console.log(`\n🔍 Checking user: ${userEmail}\n`);

// 1. Check if user exists in auth.users
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.error('❌ Error fetching users:', authError.message);
  process.exit(1);
}

const user = authUsers.users.find(u => u.email === userEmail);

if (!user) {
  console.log('❌ User not found in auth.users');
  console.log('\nℹ️  User needs to be created first.');
  process.exit(0);
}

console.log('✅ User found in auth.users');
console.log(`   User ID: ${user.id}`);
console.log(`   Email: ${user.email}`);
console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);

// 2. Check if profile exists
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();

if (profileError) {
  console.error('\n❌ Error fetching profile:', profileError.message);
  process.exit(1);
}

if (!profile) {
  console.log('\n⚠️  NO PROFILE FOUND - This is the problem!');
  console.log('\nℹ️  Creating profile now...');

  // Get first tenant to assign
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .limit(1);

  if (!tenants || tenants.length === 0) {
    console.error('❌ No tenants found in database');
    process.exit(1);
  }

  const tenant = tenants[0];

  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      tenant_id: tenant.id,
      email: user.email,
      role: 'admin',
      display_name: user.email.split('@')[0],
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating profile:', createError.message);
    process.exit(1);
  }

  console.log('✅ Profile created successfully!');
  console.log(`   Tenant ID: ${newProfile.tenant_id}`);
  console.log(`   Tenant Name: ${tenant.name}`);
  console.log(`   Role: ${newProfile.role}`);
  console.log('\n✅ User should now be able to log in!');
} else {
  console.log('\n✅ Profile found');
  console.log(`   Tenant ID: ${profile.tenant_id || '❌ MISSING'}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Display Name: ${profile.display_name || 'Not set'}`);

  if (!profile.tenant_id) {
    console.log('\n⚠️  TENANT_ID IS MISSING - This is the problem!');

    // Get first tenant
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1);

    if (tenants && tenants.length > 0) {
      const tenant = tenants[0];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ tenant_id: tenant.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
      } else {
        console.log(`\n✅ Fixed! Tenant ID set to: ${tenant.id} (${tenant.name})`);
        console.log('✅ User should now be able to log in!');
      }
    }
  } else {
    console.log('\n✅ Everything looks good! User should be able to log in.');
  }
}
