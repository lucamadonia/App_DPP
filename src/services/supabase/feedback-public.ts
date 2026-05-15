/**
 * Public (anon) feedback access — wraps the SECURITY DEFINER RPCs defined
 * in migration 20260516_feedback_module.sql. No tenant auth required;
 * the token IS the auth.
 */
import { supabase } from '@/lib/supabase';
import type {
  PublicFeedbackRequest,
  PublicFeedbackReviewItem,
  PublicFeedbackIdea,
  PublicIdeaInvite,
  FeedbackIdeaArea,
  FeedbackIdeaCategory,
  FeedbackIdeaStatus,
} from '@/types/feedback';

// ============================================
// CUSTOMER REVIEWS — PUBLIC
// ============================================

export async function getFeedbackRequestByToken(
  token: string,
): Promise<PublicFeedbackRequest | { error: string }> {
  const { data, error } = await supabase.rpc('get_feedback_request_by_token', {
    p_token: token,
  });
  if (error) return { error: error.message };
  if (!data) return { error: 'empty_response' };
  if (data.error) return { error: data.error as string };
  return data as PublicFeedbackRequest;
}

export interface ReviewSubmitItem {
  request_id: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewer_city?: string;
}

export async function submitFeedbackReviews(
  token: string,
  reviews: ReviewSubmitItem[],
): Promise<{ ok: boolean; reviewIds?: string[]; error?: string }> {
  const { data, error } = await supabase.rpc('submit_feedback_reviews', {
    p_token: token,
    p_reviews: reviews,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'empty_response' };
  if (data.error) return { ok: false, error: data.error as string };
  return { ok: true, reviewIds: data.review_ids || [] };
}

export async function getPublicReviewsForTenant(params: {
  tenantSlug: string;
  productId?: string;
  minRating?: number;
  limit?: number;
}): Promise<PublicFeedbackReviewItem[]> {
  const { data, error } = await supabase.rpc('get_public_feedback_reviews', {
    p_tenant_slug: params.tenantSlug,
    p_product_id: params.productId || null,
    p_min_rating: params.minRating || 1,
    p_limit: params.limit || 12,
  });
  if (error || !data) return [];
  return (data as PublicFeedbackReviewItem[]) || [];
}

/**
 * Build a public URL for a photo in the feedback-photos bucket.
 * The bucket is public, so we can construct the URL deterministically.
 */
export function getFeedbackPhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('feedback-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ============================================
// PHOTOS — PUBLIC UPLOAD
// ============================================

/**
 * Upload a photo for a feedback review. Bucket is public-read and
 * authenticated-write — but since the public submission flow is anon,
 * we route through a Storage upload that's allowed for `anon` via the
 * RLS policy on storage.objects. The path encodes the review_id so it
 * can be linked via the photos table.
 *
 * NOTE: For anon uploads to work, the storage.objects policy must allow
 * INSERT for anon on this bucket. The migration creates a permissive
 * policy for SELECT only; writes require a SECURITY DEFINER RPC or an
 * authenticated session. For now, photo uploads are best-effort and
 * gracefully fail if anon write is denied.
 */
export async function uploadFeedbackPhoto(params: {
  reviewId: string;
  tenantId: string;
  file: File;
}): Promise<{ storagePath: string } | { error: string }> {
  const ext = (params.file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${params.tenantId}/${params.reviewId}/${filename}`;

  const { error } = await supabase.storage
    .from('feedback-photos')
    .upload(path, params.file, { contentType: params.file.type, upsert: false });

  if (error) return { error: error.message };

  // Link in feedback_photos table — also requires INSERT permission which
  // is gated by RLS; only authenticated tenant users can do this directly.
  // Public flow: photo path is stored via the submit RPC, not here.
  return { storagePath: path };
}

// ============================================
// IDEA BOARD — PUBLIC
// ============================================

export async function getIdeaInviteByToken(
  token: string,
): Promise<PublicIdeaInvite | { error: string }> {
  const { data, error } = await supabase.rpc('get_feedback_idea_invite_by_token', {
    p_token: token,
  });
  if (error) return { error: error.message };
  if (!data) return { error: 'empty_response' };
  if (data.error) return { error: data.error as string };
  return data as PublicIdeaInvite;
}

export async function submitIdea(
  token: string,
  payload: {
    area: FeedbackIdeaArea;
    category: FeedbackIdeaCategory;
    title: string;
    body: string;
    rating?: number;
    is_public_requested: boolean;
  },
): Promise<{ ok: boolean; ideaId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('submit_feedback_idea', {
    p_token: token,
    p_payload: payload,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'empty_response' };
  if (data.error) return { ok: false, error: data.error as string };
  return { ok: true, ideaId: data.idea_id as string };
}

export async function getPublicIdeasForTenant(params: {
  tenantSlug: string;
  status?: FeedbackIdeaStatus;
  category?: FeedbackIdeaCategory;
  limit?: number;
}): Promise<PublicFeedbackIdea[]> {
  const { data, error } = await supabase.rpc('get_public_feedback_ideas', {
    p_tenant_slug: params.tenantSlug,
    p_status: params.status || null,
    p_category: params.category || null,
    p_limit: params.limit || 50,
  });
  if (error || !data) return [];
  return (data as PublicFeedbackIdea[]) || [];
}

export async function voteIdea(
  token: string,
  ideaId: string,
): Promise<{ ok: boolean; upvoteCount?: number; error?: string }> {
  const { data, error } = await supabase.rpc('vote_feedback_idea', {
    p_token: token,
    p_idea_id: ideaId,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || data.error) return { ok: false, error: (data?.error as string) || 'failed' };
  return { ok: true, upvoteCount: data.upvote_count as number };
}

export async function unvoteIdea(
  token: string,
  ideaId: string,
): Promise<{ ok: boolean; upvoteCount?: number; error?: string }> {
  const { data, error } = await supabase.rpc('unvote_feedback_idea', {
    p_token: token,
    p_idea_id: ideaId,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || data.error) return { ok: false, error: (data?.error as string) || 'failed' };
  return { ok: true, upvoteCount: data.upvote_count as number };
}
