/**
 * Returns Hub - Typen für das Retourenmanagement-Modul
 *
 * Diese Datei enthält alle TypeScript-Interfaces und Typen für den Returns Hub.
 * Properties verwenden camelCase (Service-Layer transformiert von snake_case DB-Spalten).
 */

// ============================================
// RETURNS HUB - STATUS & ENUM TYPES
// ============================================

export type ReturnStatus =
  | 'CREATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'LABEL_GENERATED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'INSPECTION_IN_PROGRESS'
  | 'REFUND_PROCESSING'
  | 'REFUND_COMPLETED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type ReturnPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DesiredSolution = 'refund' | 'exchange' | 'voucher' | 'repair';
export type ItemCondition = 'new' | 'like_new' | 'used' | 'damaged' | 'defective';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketSenderType = 'agent' | 'customer' | 'system';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'websocket';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// ============================================
// RETURNS HUB - CUSTOMER
// ============================================

export interface RhCustomerAddress {
  type: 'billing' | 'shipping';
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface RhCustomerReturnStats {
  totalReturns: number;
  totalValue: number;
  returnRate: number;
}

export interface RhCustomer {
  id: string;
  tenantId: string;
  externalId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  addresses: RhCustomerAddress[];
  paymentMethods: unknown[];
  returnStats: RhCustomerReturnStats;
  riskScore: number;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RETURNS HUB - RETURN
// ============================================

export interface RhInspectionResult {
  inspectedBy?: string;
  inspectedAt?: string;
  condition?: ItemCondition;
  notes?: string;
  photos?: string[];
  approved?: boolean;
}

export interface RhCustomsData {
  scenario?: 'eu_internal' | 'reimport' | 'drawback' | 'return_shipment' | 'repair';
  countryOfOrigin?: string;
  hsCode?: string;
  customsValue?: number;
  currency?: string;
  drawbackReference?: string;
  originalImportDate?: string;
  originalImportReference?: string;
  aesReference?: string;
  notes?: string;
}

export interface RhReturn {
  id: string;
  tenantId: string;
  returnNumber: string;
  status: ReturnStatus;
  customerId?: string;
  orderId?: string;
  orderDate?: string;
  reasonCategory?: string;
  reasonSubcategory?: string;
  reasonText?: string;
  desiredSolution?: DesiredSolution;
  shippingMethod?: string;
  trackingNumber?: string;
  labelUrl?: string;
  labelExpiresAt?: string;
  inspectionResult?: RhInspectionResult;
  refundAmount?: number;
  refundMethod?: string;
  refundReference?: string;
  refundedAt?: string;
  priority: ReturnPriority;
  assignedTo?: string;
  internalNotes?: string;
  customsData?: RhCustomsData;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RETURNS HUB - RETURN ITEM
// ============================================

export interface RhReturnItem {
  id: string;
  returnId: string;
  tenantId: string;
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  batchNumber?: string;
  serialNumber?: string;
  warrantyStatus?: string;
  condition?: ItemCondition;
  approved: boolean;
  refundAmount?: number;
  photos: string[];
  notes?: string;
  createdAt: string;
}

// ============================================
// RETURNS HUB - TIMELINE
// ============================================

export interface RhReturnTimeline {
  id: string;
  returnId: string;
  tenantId: string;
  status: string;
  comment?: string;
  actorId?: string;
  actorType: 'system' | 'agent' | 'customer';
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// RETURNS HUB - TICKET
// ============================================

export interface RhTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  customerId?: string;
  returnId?: string;
  category?: string;
  subcategory?: string;
  priority: ReturnPriority;
  status: TicketStatus;
  subject: string;
  assignedTo?: string;
  slaFirstResponseAt?: string;
  slaResolutionAt?: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RETURNS HUB - TICKET MESSAGE
// ============================================

export interface RhTicketMessage {
  id: string;
  ticketId: string;
  tenantId: string;
  senderType: TicketSenderType;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  content: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: string;
}

// ============================================
// RETURNS HUB - RETURN REASONS
// ============================================

export interface RhFollowUpQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface RhReturnReason {
  id: string;
  tenantId: string;
  category: string;
  subcategories: string[];
  followUpQuestions: RhFollowUpQuestion[];
  requiresPhotos: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

// ============================================
// RETURNS HUB - WORKFLOW RULES
// ============================================

export interface RhWorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
}

export interface RhWorkflowAction {
  type: 'set_status' | 'set_priority' | 'assign_to' | 'send_notification' | 'add_tag' | 'approve' | 'reject';
  params: Record<string, unknown>;
}

export interface RhWorkflowRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  actions: RhWorkflowAction[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RETURNS HUB - NOTIFICATIONS
// ============================================

export type RhNotificationEventType =
  | 'return_confirmed'
  | 'return_approved'
  | 'return_rejected'
  | 'return_shipped'
  | 'refund_completed'
  | 'ticket_created'
  | 'ticket_agent_reply';

export interface RhEmailTemplate {
  id: string;
  tenantId: string;
  eventType: RhNotificationEventType;
  enabled: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnsHubNotificationSettings {
  emailEnabled: boolean;
  senderName: string;
}

export interface RhNotification {
  id: string;
  tenantId: string;
  returnId?: string;
  ticketId?: string;
  customerId?: string;
  channel: NotificationChannel;
  template?: string;
  recipientEmail?: string;
  subject?: string;
  content?: string;
  status: NotificationStatus;
  sentAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// RETURNS HUB - SETTINGS (stored in tenants.settings.returnsHub)
// ============================================

export interface ReturnsHubFeatures {
  customBranding: boolean;
  customHtmlCss: boolean;
  whitelabelDomain: boolean;
  crmTickets: boolean;
  apiAccess: 'none' | 'readonly' | 'readwrite';
  webhooks: boolean;
  customsIntegration: boolean;
  workflowRules: boolean;
}

export interface ReturnsHubUsage {
  returnsThisMonth: number;
  lastResetAt: string;
}

export interface ReturnsHubBranding {
  primaryColor: string;
  logoUrl: string;
  customCss: string;
  customHtml: Record<string, string>;
}

export interface ReturnsHubSettings {
  enabled: boolean;
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  prefix: string;
  maxReturnsPerMonth: number;
  maxAdminUsers: number;
  features: ReturnsHubFeatures;
  usage: ReturnsHubUsage;
  branding: ReturnsHubBranding;
  notifications: ReturnsHubNotificationSettings;
}

// ============================================
// RETURNS HUB - DASHBOARD STATS
// ============================================

export interface ReturnsHubStats {
  openReturns: number;
  todayReceived: number;
  avgProcessingDays: number;
  returnRate: number;
  refundVolume: number;
  slaCompliance: number;
  openTickets: number;
  returnsByStatus: Record<ReturnStatus, number>;
  returnsByReason: Record<string, number>;
  dailyReturns: Array<{ date: string; count: number }>;
}

// ============================================
// RETURNS HUB - FILTER/PAGINATION TYPES
// ============================================

export interface ReturnsFilter {
  status?: ReturnStatus[];
  priority?: ReturnPriority[];
  assignedTo?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TicketsFilter {
  status?: TicketStatus[];
  priority?: ReturnPriority[];
  assignedTo?: string;
  customerId?: string;
  returnId?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
