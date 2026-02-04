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
const productId = '55129c9f-843d-4ed8-9756-9db06f6ebd81';
const tenantId = '522f6254-f73c-4a26-b1e9-662035194bc5';

console.log('\n🔧 Fixing product...\n');

// 1. Set product to active
const { error: updateError } = await supabase
  .from('products')
  .update({ status: 'active' })
  .eq('id', productId);

if (updateError) {
  console.error('❌ Error updating product:', updateError.message);
} else {
  console.log('✅ Product status set to "active"');
}

// 2. Create a batch with serial number
const batchNumber = 'BATCH-2025-001';

const { data: batch, error: batchError } = await supabase
  .from('product_batches')
  .insert({
    product_id: productId,
    tenant_id: tenantId,
    batch_number: batchNumber,
    quantity: 1,
    production_date: new Date().toISOString().split('T')[0],
    status: 'active',
    serial_numbers: [serial],
  })
  .select()
  .single();

if (batchError) {
  console.error('❌ Error creating batch:', batchError.message);
} else {
  console.log('✅ Batch created:', batch.batch_number);
  console.log('   Serial numbers:', batch.serial_numbers);
}

console.log('\n🌐 Public URL should now work:');
console.log('   https://app-dpp.vercel.app/p/' + gtin + '/' + serial);
console.log('\n✅ Product page should now load correctly!');
console.log('✅ "Contact Support" button should appear in Support section!');
