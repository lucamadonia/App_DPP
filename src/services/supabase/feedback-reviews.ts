/**
 * Admin-side CRUD + moderation for customer reviews.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  FeedbackReview,
  FeedbackReviewFilter,
  FeedbackPhoto,
  FeedbackReply,
} from '@/types/feedback';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformReview(row: any): FeedbackReview {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requestId: row.request_id,
    productId: row.product_id,
    batchId: row.batch_id || undefined,
    variantTitle: row.variant_title || undefined,
    rating: row.rating,
    title: row.title || undefined,
    comment: row.comment || undefined,
    reviewerDisplayName: row.reviewer_display_name,
    reviewerCity: row.reviewer_city || undefined,
    reviewerCountry: row.reviewer_country || undefined,
    status: row.status,
    moderationNotes: row.moderation_notes || undefined,
    aiSentiment: row.ai_sentiment || undefined,
    aiSpamScore: row.ai_spam_score != null ? Number(row.ai_spam_score) : undefined,
    aiFlags: row.ai_flags || undefined,
    aiSuggestedTags: row.ai_suggested_tags || undefined,
    tags: row.tags || undefined,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    rejectedAt: row.rejected_at || undefined,
    rejectedReason: row.rejected_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.products?.name,
    productImage: row.products?.image_url,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPhoto(row: any): FeedbackPhoto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reviewId: row.review_id,
    storagePath: row.storage_path,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformReply(row: any): FeedbackReply {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reviewId: row.review_id,
    authorUserId: row.author_user_id || undefined,
    authorDisplayName: row.author_display_name,
    content: row.content,
    visible: !!row.visible,
    createdAt: row.created_at,
  };
}

export async function getReviews(filter?: FeedbackReviewFilter): Promise<FeedbackReview[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let q = supabase
    .from('feedback_reviews')
    .select('*, products(name, image_url)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.productId) q = q.eq('product_id', filter.productId);
  if (filter?.batchId) q = q.eq('batch_id', filter.batchId);
  if (filter?.minRating) q = q.gte('rating', filter.minRating);
  if (filter?.search) q = q.or(`title.ilike.%${filter.search}%,comment.ilike.%${filter.search}%`);
  if (filter?.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(transformReview);
}

export async function getReviewDetail(id: string): Promise<FeedbackReview | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from('feedback_reviews')
    .select('*, products(name, image_url)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error || !data) return null;

  const review = transformReview(data);

  const [{ data: photos }, { data: replies }] = await Promise.all([
    supabase.from('feedback_photos').select('*').eq('review_id', id).order('sort_order'),
    supabase.from('feedback_replies').select('*').eq('review_id', id).order('created_at'),
  ]);
  review.photos = (photos || []).map(transformPhoto);
  review.replies = (replies || []).map(transformReply);
  return review;
}

export async function approveReview(id: string, edits?: Partial<FeedbackReview>): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data: user } = await supabase.auth.getUser();

  const patch: Record<string, unknown> = {
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.user?.id,
  };
  if (edits?.title !== undefined) patch.title = edits.title;
  if (edits?.comment !== undefined) patch.comment = edits.comment;
  if (edits?.reviewerDisplayName !== undefined) patch.reviewer_display_name = edits.reviewerDisplayName;
  if (edits?.tags !== undefined) patch.tags = edits.tags;

  const { error } = await supabase
    .from('feedback_reviews')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}

export async function rejectReview(id: string, reason?: string): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { error } = await supabase
    .from('feedback_reviews')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason || null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}

export async function hideReview(id: string): Promise<void> {
  await supabase.from('feedback_reviews').update({ status: 'hidden' }).eq('id', id);
}

export async function addReply(reviewId: string, content: string, authorName: string): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase.from('feedback_replies').insert({
    tenant_id: tenantId,
    review_id: reviewId,
    author_user_id: user.user?.id,
    author_display_name: authorName,
    content,
    visible: true,
  });
  if (error) throw new Error(error.message);
}

export interface ReviewStats {
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  averageRating: number | null;
  total: number;
  ratingDistribution: { rating: 1 | 2 | 3 | 4 | 5; count: number }[];
}

export async function getReviewStats(): Promise<ReviewStats> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0,
      averageRating: null,
      total: 0,
      ratingDistribution: [1, 2, 3, 4, 5].map(r => ({ rating: r as 1 | 2 | 3 | 4 | 5, count: 0 })),
    };
  }

  const { data } = await supabase
    .from('feedback_reviews')
    .select('status, rating')
    .eq('tenant_id', tenantId);

  const rows: Array<{ status: string; rating: number }> = data || [];
  let approvedSum = 0;
  let approvedCount = 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let hidden = 0;

  for (const r of rows) {
    if (r.status === 'pending_review') pending++;
    else if (r.status === 'approved') {
      approved++;
      approvedSum += r.rating;
      approvedCount++;
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    } else if (r.status === 'rejected') rejected++;
    else if (r.status === 'hidden') hidden++;
  }

  return {
    pending,
    approved,
    rejected,
    hidden,
    averageRating: approvedCount > 0 ? approvedSum / approvedCount : null,
    total: rows.length,
    ratingDistribution: [1, 2, 3, 4, 5].map(r => ({
      rating: r as 1 | 2 | 3 | 4 | 5,
      count: dist[r] || 0,
    })),
  };
}
