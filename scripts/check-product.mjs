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

const gtin = '4269999010061';
const serial = 'FAM-MAG-0725-01006';

console.log(`\n🔍 Checking product: ${gtin} / ${serial}\n`);

// Check if product exists
const { data: product, error: productError } = await supabase
  .from('products')
  .select('*')
  .eq('gtin', gtin)
  .maybeSingle();

if (productError) {
  console.error('❌ Error fetching product:', productError.message);
  process.exit(1);
}

if (!product) {
  console.log('❌ Product not found with GTIN:', gtin);
  console.log('\nℹ️  Creating a test product...\n');

  // Get first tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single();

  if (!tenant) {
    console.error('❌ No tenant found');
    process.exit(1);
  }

  // Create product
  const { data: newProduct, error: createError } = await supabase
    .from('products')
    .insert({
      tenant_id: tenant.id,
      gtin: gtin,
      name: 'Test Product - FAMBLISS Magnesium',
      description: 'High quality magnesium supplement',
      manufacturer: 'MYFAMBLISS GmbH',
      category: 'supplements',
      status: 'active',
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating product:', createError.message);
    process.exit(1);
  }

  console.log('✅ Product created:', newProduct.name);
  console.log('   ID:', newProduct.id);
} else {
  console.log('✅ Product found:', product.name);
  console.log('   ID:', product.id);
  console.log('   Tenant:', product.tenant_id);
  console.log('   Status:', product.status);
}

// Check batch/serial
const { data: batch, error: batchError } = await supabase
  .from('product_batches')
  .select('*')
  .eq('gtin', gtin)
  .contains('serial_numbers', [serial])
  .maybeSingle();

if (batchError) {
  console.error('\n❌ Error fetching batch:', batchError.message);
}

if (!batch) {
  console.log('\n⚠️  Batch with serial number not found');
  console.log('   GTIN:', gtin);
  console.log('   Serial:', serial);
  console.log('\nℹ️  You need to create a batch with this serial number in the admin panel.');
} else {
  console.log('\n✅ Batch found:', batch.batch_number);
  console.log('   Serial numbers:', batch.serial_numbers?.length || 0);
}

console.log('\n🌐 Public URL:');
console.log('   https://app-dpp.vercel.app/p/' + gtin + '/' + serial);
