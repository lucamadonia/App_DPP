/**
 * Supabase Product Images Service
 *
 * CRUD for product image gallery with Storage integration
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ProductImage } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProductImage(row: any): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    storagePath: row.storage_path || undefined,
    caption: row.caption || undefined,
    sortOrder: row.sort_order ?? 0,
    isPrimary: row.is_primary ?? false,
  };
}

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order');

  if (error) {
    console.error('Failed to load product images:', error);
    return [];
  }

  return (data || []).map(transformProductImage);
}

export async function uploadProductImages(
  files: File[],
  productId: string
): Promise<ProductImage[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const results: ProductImage[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${tenantId}/${productId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Failed to upload image:', uploadError);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        tenant_id: tenantId,
        product_id: productId,
        url: publicUrl,
        storage_path: fileName,
        sort_order: results.length,
        is_primary: results.length === 0,
      })
      .select('*')
      .single();

    if (!error && data) {
      results.push(transformProductImage(data));
    }
  }

  return results;
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const { data } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('id', imageId)
    .single();

  if (data?.storage_path) {
    await supabase.storage.from('product-images').remove([data.storage_path]);
  }

  await supabase.from('product_images').delete().eq('id', imageId);
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[]
): Promise<void> {
  for (let i = 0; i < imageIds.length; i++) {
    await supabase
      .from('product_images')
      .update({ sort_order: i })
      .eq('id', imageIds[i])
      .eq('product_id', productId);
  }
}

export async function setPrimaryImage(imageId: string, productId: string): Promise<void> {
  // Clear existing primary
  await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);

  // Set new primary
  await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId);
}

export async function updateImageCaption(imageId: string, caption: string): Promise<void> {
  await supabase
    .from('product_images')
    .update({ caption })
    .eq('id', imageId);
}
