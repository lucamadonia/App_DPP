/**
 * Supabase Edge Function: influencer-sync
 *
 * Receives webhook from Fambliss Partner Portal when an influencer
 * is approved, and creates/updates a wh_contact (type: 'influencer')
 * for the MYFAMBLISS tenant.
 *
 * Deployment:
 *   supabase functions deploy influencer-sync --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - INFLUENCER_SYNC_SECRET
 *   - MYFAMBLISS_TENANT_ID
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INFLUENCER_SYNC_SECRET = Deno.env.get('INFLUENCER_SYNC_SECRET') || '';
const MYFAMBLISS_TENANT_ID = Deno.env.get('MYFAMBLISS_TENANT_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Derive primary platform from which social URLs are present */
function derivePrimaryPlatform(
  instagram?: string,
  tiktok?: string,
  youtube?: string,
): string | null {
  if (instagram) return 'instagram';
  if (tiktok) return 'tiktok';
  if (youtube) return 'youtube';
  return null;
}

/** Compute influencer tier from follower count */
function computeTier(followerCount?: number): string | null {
  if (!followerCount || followerCount <= 0) return null;
  if (followerCount < 10_000) return 'nano';
  if (followerCount < 50_000) return 'micro';
  if (followerCount < 500_000) return 'mid';
  if (followerCount < 1_000_000) return 'macro';
  return 'mega';
}

/** Build the notes field from bio, motivation, and website */
function buildNotes(bio?: string, motivation?: string, website?: string): string | null {
  const parts: string[] = [];
  if (bio) parts.push(bio);
  if (motivation) parts.push(`Motivation: ${motivation}`);
  if (website) parts.push(`Website: ${website}`);
  return parts.length > 0 ? parts.join('\n\n') : null;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ status: 'error', message: 'Method not allowed' }, 405);
  }

  try {
    // Verify shared secret
    const secret = req.headers.get('x-webhook-secret');
    if (!secret || secret !== INFLUENCER_SYNC_SECRET) {
      return jsonResponse({ status: 'error', message: 'Unauthorized' }, 401);
    }

    if (!MYFAMBLISS_TENANT_ID) {
      console.error('MYFAMBLISS_TENANT_ID is not configured');
      return jsonResponse({ status: 'error', message: 'Tenant not configured' }, 500);
    }

    const payload = await req.json();
    const {
      display_name,
      email,
      phone,
      instagram_url,
      tiktok_url,
      youtube_url,
      website_url,
      follower_count,
      bio,
      motivation,
    } = payload;

    if (!email || !display_name) {
      return jsonResponse(
        { status: 'error', message: 'email and display_name are required' },
        400,
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const contactData = {
      tenant_id: MYFAMBLISS_TENANT_ID,
      type: 'influencer' as const,
      contact_name: display_name,
      email,
      phone: phone || null,
      instagram_handle: instagram_url || null,
      tiktok_handle: tiktok_url || null,
      youtube_handle: youtube_url || null,
      primary_platform: derivePrimaryPlatform(instagram_url, tiktok_url, youtube_url),
      follower_count: follower_count || null,
      influencer_tier: computeTier(follower_count),
      notes: buildNotes(bio, motivation, website_url),
      tags: ['partner-portal-sync'],
      is_active: true,
    };

    // Check for existing contact with same email + tenant
    const { data: existing } = await supabase
      .from('wh_contacts')
      .select('id')
      .eq('tenant_id', MYFAMBLISS_TENANT_ID)
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Update existing contact
      const { data: updated, error } = await supabase
        .from('wh_contacts')
        .update({
          ...contactData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to update wh_contact:', error);
        return jsonResponse({ status: 'error', message: error.message }, 500);
      }

      console.log(`Updated wh_contact ${updated.id} for influencer ${email}`);
      return jsonResponse({ status: 'updated', contactId: updated.id });
    }

    // Insert new contact
    const { data: created, error } = await supabase
      .from('wh_contacts')
      .insert(contactData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create wh_contact:', error);
      return jsonResponse({ status: 'error', message: error.message }, 500);
    }

    console.log(`Created wh_contact ${created.id} for influencer ${email}`);
    return jsonResponse({ status: 'created', contactId: created.id });
  } catch (error) {
    console.error('influencer-sync error:', error);
    return jsonResponse({ status: 'error', message: 'Internal server error' }, 500);
  }
});
