/**
 * Types for the Feedback module — covers two surfaces under one umbrella:
 *
 *   A) Customer Reviews — verified buyer rates products after delivery.
 *      Token-link based, embeddable on tenant homepage.
 *
 *   B) Partner Idea Board — power users submit ideas / bugs / feature
 *      requests via token-link. Mix-visibility: private until approved,
 *      then public on a votable idea board.
 */

// ============================================
// CUSTOMER REVIEWS
// ============================================

export type FeedbackRequestStatus =
  | 'pending'
  | 'opened'
  | 'submitted'
  | 'expired'
  | 'cancelled';

export type FeedbackReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'hidden';

export type FeedbackAiSentiment = 'positive' | 'neutral' | 'negative';

export interface FeedbackRequest {
  id: string;
  tenantId: string;
  shipmentId: string;
  productId: string;
  batchId?: string;
  variantTitle?: string;
  customerEmail: string;
  customerName: string;
  token: string;
  status: FeedbackRequestStatus;
  sentAt?: string;
  openedAt?: string;
  submittedAt?: string;
  expiresAt: string;
  reminderSentAt?: string;
  createdAt: string;
  createdBy?: string;
  // Joined
  productName?: string;
  productImage?: string;
  shipmentNumber?: string;
}

export interface FeedbackReview {
  id: string;
  tenantId: string;
  requestId: string;
  productId: string;
  batchId?: string;
  variantTitle?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  reviewerDisplayName: string;
  reviewerCity?: string;
  reviewerCountry?: string;
  status: FeedbackReviewStatus;
  moderationNotes?: string;
  aiSentiment?: FeedbackAiSentiment;
  aiSpamScore?: number;
  aiFlags?: Record<string, unknown>;
  aiSuggestedTags?: string[];
  tags?: string[];
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Joined (optional, populated on detail load)
  productName?: string;
  productImage?: string;
  photos?: FeedbackPhoto[];
  replies?: FeedbackReply[];
}

export interface FeedbackPhoto {
  id: string;
  tenantId: string;
  reviewId: string;
  storagePath: string;
  publicUrl?: string;
  sortOrder: number;
  createdAt: string;
}

export interface FeedbackReply {
  id: string;
  tenantId: string;
  reviewId: string;
  authorUserId?: string;
  authorDisplayName: string;
  content: string;
  visible: boolean;
  createdAt: string;
}

// ============================================
// IDEA BOARD
// ============================================

export type FeedbackIdeaInviteStatus =
  | 'pending'
  | 'opened'
  | 'active'
  | 'expired'
  | 'cancelled';

export type FeedbackIdeaStatus =
  | 'pending_review'
  | 'published'
  | 'in_progress'
  | 'done'
  | 'rejected'
  | 'hidden';

export type FeedbackIdeaRoadmapStatus =
  | 'considering'
  | 'planned'
  | 'in_progress'
  | 'shipped'
  | 'wont_do';

export type FeedbackIdeaArea = 'app_portal' | 'products' | 'general';

export type FeedbackIdeaCategory =
  | 'improvement'
  | 'new_idea'
  | 'bug'
  | 'praise'
  | 'other';

export interface FeedbackIdeaInvite {
  id: string;
  tenantId: string;
  partnerEmail: string;
  partnerName: string;
  token: string;
  shipmentId?: string;
  status: FeedbackIdeaInviteStatus;
  sentAt?: string;
  openedAt?: string;
  lastUsedAt?: string;
  expiresAt: string;
  createdAt: string;
  createdBy?: string;
}

export interface FeedbackIdea {
  id: string;
  tenantId: string;
  inviteId?: string;
  submitterEmail: string;
  submitterName: string;
  submitterDisplayName: string;
  area: FeedbackIdeaArea;
  category: FeedbackIdeaCategory;
  title: string;
  body: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  isPublicRequested: boolean;
  status: FeedbackIdeaStatus;
  roadmapStatus?: FeedbackIdeaRoadmapStatus;
  adminResponse?: string;
  moderationNotes?: string;
  upvoteCount: number;
  tags?: string[];
  approvedAt?: string;
  approvedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined / derived
  hasVoted?: boolean;
}

// ============================================
// PUBLIC PAYLOADS (from RPCs)
// ============================================

export interface PublicFeedbackRequest {
  request_id: string;
  token: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_branding?: Record<string, unknown>;
  customer_name: string;
  customer_email: string;
  expires_at: string;
  items: Array<{
    request_id: string;
    product_id: string;
    batch_id?: string;
    variant_title?: string;
    product_name: string;
    product_image?: string;
    is_self: boolean;
  }>;
}

export interface PublicFeedbackReviewItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_title?: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewer_display_name: string;
  reviewer_city?: string;
  created_at: string;
  photos: Array<{ path: string }>;
  reply?: { author: string; content: string; created_at: string };
  aggregate_rating: number | null;
  total_count: number | null;
}

export interface PublicFeedbackIdea {
  id: string;
  area: FeedbackIdeaArea;
  category: FeedbackIdeaCategory;
  title: string;
  body: string;
  rating?: number;
  submitter_display_name: string;
  status: FeedbackIdeaStatus;
  roadmap_status?: FeedbackIdeaRoadmapStatus;
  admin_response?: string;
  upvote_count: number;
  tags?: string[];
  created_at: string;
  completed_at?: string;
  // Client-side
  hasVoted?: boolean;
}

export interface PublicIdeaInvite {
  invite_id: string;
  token: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_branding?: Record<string, unknown>;
  partner_name: string;
  partner_email: string;
  expires_at: string;
}

// ============================================
// TENANT SETTINGS
// ============================================

export type FeedbackWidgetMode = 'carousel' | 'grid' | 'badge';
export type FeedbackWidgetCardStyle = 'modern' | 'classic' | 'minimal';

export interface FeedbackSettings {
  enabled: boolean;
  /** Admin must approve every review before it goes public. Default: true */
  requireApproval: boolean;
  allowPhotos: boolean;
  maxPhotosPerReview: number;
  showReviewerCity: boolean;
  defaultExpiryDays: number;
  aiModerationEnabled: boolean;
  /** Idea-board specific */
  ideaBoardEnabled: boolean;
  ideaInviteExpiryDays: number;
  /** Widget appearance + behavior */
  widget: {
    defaultMode: FeedbackWidgetMode;
    maxReviews: number;
    showRatingDistribution: boolean;
    showProductFilter: boolean;
    accentColor?: string;
    fontFamily?: 'system' | 'Inter' | 'Poppins' | 'Merriweather';
    cardStyle: FeedbackWidgetCardStyle;
  };
  /** Email overrides (optional — falls back to defaults if blank) */
  emails: {
    fromName?: string;
    requestSubject?: string;
    requestBody?: string;
    reminderSubject?: string;
    reminderBody?: string;
    ideaInviteSubject?: string;
    ideaInviteBody?: string;
  };
}

// ============================================
// FILTERS
// ============================================

export interface FeedbackReviewFilter {
  status?: FeedbackReviewStatus | FeedbackReviewStatus[];
  productId?: string;
  batchId?: string;
  minRating?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FeedbackIdeaFilter {
  status?: FeedbackIdeaStatus | FeedbackIdeaStatus[];
  area?: FeedbackIdeaArea;
  category?: FeedbackIdeaCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FeedbackRequestFilter {
  status?: FeedbackRequestStatus | FeedbackRequestStatus[];
  shipmentId?: string;
  limit?: number;
  offset?: number;
}
