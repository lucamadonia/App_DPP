/**
 * Supabase Product Components Service
 *
 * CRUD for product set components (junction table).
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ProductComponent, ProductComponentSummary } from '@/types/product';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformComponent(row: any): ProductComponent {
  return {
    id: row.id,
    parentProductId: row.parent_product_id,
    componentProductId: row.component_product_id,
    quantity: row.quantity,
    sortOrder: row.sort_order || 0,
    notes: row.notes || undefined,
    componentProduct: row.component_product
      ? transformComponentSummary(row.component_product)
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformComponentSummary(p: any): ProductComponentSummary {
  return {
    id: p.id,
    name: p.name,
    gtin: p.gtin,
    manufacturer: p.manufacturer,
    category: p.category,
    imageUrl: p.image_url || undefined,
    materials: p.materials || [],
    carbonFootprint: p.carbon_footprint || undefined,
    recyclability: p.recyclability || { recyclablePercentage: 0, instructions: '', disposalMethods: [] },
    netWeight: p.net_weight != null ? Number(p.net_weight) : undefined,
    grossWeight: p.gross_weight != null ? Number(p.gross_weight) : undefined,
  };
}

/**
 * Get components for a product set (authenticated).
 */
export async function getProductComponents(productId: string): Promise<ProductComponent[]> {
  const { data, error } = await supabase
    .from('product_components')
    .select(`
      *,
      component_product:products!product_components_component_product_id_fkey(
        id, name, gtin, manufacturer, category, image_url,
        materials, carbon_footprint, recyclability, net_weight, gross_weight
      )
    `)
    .eq('parent_product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load product components:', error);
    return [];
  }

  return (data || []).map(transformComponent);
}

/**
 * Get components for a product set (public, no auth required).
 */
export async function getProductComponentsPublic(productId: string): Promise<ProductComponent[]> {
  const { data, error } = await supabase
    .from('product_components')
    .select(`
      *,
      component_product:products!product_components_component_product_id_fkey(
        id, name, gtin, manufacturer, category, image_url,
        materials, carbon_footprint, recyclability, net_weight, gross_weight
      )
    `)
    .eq('parent_product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load public product components:', error);
    return [];
  }

  return (data || []).map(transformComponent);
}

/**
 * Add a component to a product set.
 */
export async function addProductComponent(
  parentProductId: string,
  componentProductId: string,
  quantity = 1,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Check for cycle
  const hasCycle = await detectCycle(parentProductId, componentProductId);
  if (hasCycle) {
    return { success: false, error: 'Adding this component would create a circular dependency.' };
  }

  // Get next sort order
  const { count } = await supabase
    .from('product_components')
    .select('id', { count: 'exact', head: true })
    .eq('parent_product_id', parentProductId);

  const { data, error } = await supabase
    .from('product_components')
    .insert({
      tenant_id: tenantId,
      parent_product_id: parentProductId,
      component_product_id: componentProductId,
      quantity,
      sort_order: count || 0,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This product is already a component of this set.' };
    }
    console.error('Failed to add product component:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

/**
 * Update a component (quantity, sort_order, notes).
 */
export async function updateProductComponent(
  id: string,
  updates: { quantity?: number; sortOrder?: number; notes?: string },
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const { error } = await supabase
    .from('product_components')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update product component:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a component from a product set.
 */
export async function removeProductComponent(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('product_components')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to remove product component:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder components by providing ordered IDs.
 */
export async function reorderProductComponents(
  parentProductId: string,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('product_components')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('parent_product_id', parentProductId);

    if (error) {
      console.error('Failed to reorder components:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

/**
 * Get sets that contain a given product as a component.
 */
export async function getProductsContaining(componentProductId: string): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('product_components')
    .select(`
      parent_product:products!product_components_parent_product_id_fkey(id, name)
    `)
    .eq('component_product_id', componentProductId);

  if (error) {
    console.error('Failed to load containing products:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.parent_product?.id,
    name: row.parent_product?.name,
  })).filter(p => p.id);
}

/**
 * App-level cycle detection.
 * Checks if adding candidateId as a component of parentId would create a cycle.
 * A cycle exists if candidateId is an ancestor of parentId in the component tree.
 */
async function detectCycle(parentId: string, candidateId: string): Promise<boolean> {
  // If candidate is the same as parent, cycle detected (handled by CHECK constraint too)
  if (parentId === candidateId) return true;

  // Walk up from candidateId: if candidateId is itself a set, check its components recursively
  const visited = new Set<string>();
  const queue = [candidateId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Check if currentId is a set with components
    const { data } = await supabase
      .from('product_components')
      .select('component_product_id')
      .eq('parent_product_id', currentId);

    if (data) {
      for (const row of data) {
        if (row.component_product_id === parentId) return true;
        queue.push(row.component_product_id);
      }
    }
  }

  // Also check: is parentId already a component somewhere in candidateId's ancestor chain?
  const ancestorQueue = [parentId];
  const ancestorVisited = new Set<string>();

  while (ancestorQueue.length > 0) {
    const currentId = ancestorQueue.shift()!;
    if (ancestorVisited.has(currentId)) continue;
    ancestorVisited.add(currentId);

    // Find all sets that contain currentId
    const { data: parents } = await supabase
      .from('product_components')
      .select('parent_product_id')
      .eq('component_product_id', currentId);

    if (parents) {
      for (const row of parents) {
        if (row.parent_product_id === candidateId) return true;
        ancestorQueue.push(row.parent_product_id);
      }
    }
  }

  return false;
}

/**
 * Count of components for a product. Returns 0 if not a set.
 */
export async function getComponentCount(productId: string): Promise<number> {
  const { count, error } = await supabase
    .from('product_components')
    .select('id', { count: 'exact', head: true })
    .eq('parent_product_id', productId);

  if (error) return 0;
  return count || 0;
}
