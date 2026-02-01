/**
 * Email Template Editor - TypeScript Types
 */

export type EmailBlockType = 'text' | 'button' | 'divider' | 'spacer' | 'info-box';

export interface EmailTextBlock {
  type: 'text';
  id: string;
  content: string;
}

export interface EmailButtonBlock {
  type: 'button';
  id: string;
  text: string;
  url: string;
  alignment: 'left' | 'center' | 'right';
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
}

export interface EmailDividerBlock {
  type: 'divider';
  id: string;
  color: string;
  thickness: number;
}

export interface EmailSpacerBlock {
  type: 'spacer';
  id: string;
  height: number;
}

export interface EmailInfoBoxBlock {
  type: 'info-box';
  id: string;
  label: string;
  value: string;
  backgroundColor: string;
  borderColor: string;
}

export type EmailBlock =
  | EmailTextBlock
  | EmailButtonBlock
  | EmailDividerBlock
  | EmailSpacerBlock
  | EmailInfoBoxBlock;

export interface EmailHeaderConfig {
  enabled: boolean;
  showLogo: boolean;
  logoUrl: string;
  logoHeight: number;
  backgroundColor: string;
  textColor: string;
  alignment: 'left' | 'center' | 'right';
}

export interface EmailFooterConfig {
  enabled: boolean;
  text: string;
  links: Array<{ label: string; url: string }>;
  backgroundColor: string;
  textColor: string;
}

export interface EmailLayoutConfig {
  maxWidth: number;
  backgroundColor: string;
  contentBackgroundColor: string;
  borderRadius: number;
  fontFamily: string;
  baseFontSize: number;
}

export interface EmailLocaleContent {
  blocks: EmailBlock[];
  subjectTemplate?: string;
  footerText?: string;
}

export interface EmailDesignConfig {
  layout: EmailLayoutConfig;
  header: EmailHeaderConfig;
  blocks: EmailBlock[];
  footer: EmailFooterConfig;
  locales?: Record<string, EmailLocaleContent>;
}

export type EmailTemplateCategory = 'returns' | 'tickets' | 'general';

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  return_confirmed: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'reason', label: 'Reason', example: 'Defective item' },
  ],
  return_approved: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'trackingUrl', label: 'Tracking URL', example: 'https://track.example.com/123' },
  ],
  return_rejected: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'reason', label: 'Reason', example: 'Item not in original condition' },
  ],
  return_shipped: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'status', label: 'Status', example: 'Shipped' },
    { key: 'trackingUrl', label: 'Tracking URL', example: 'https://track.example.com/123' },
  ],
  return_label_ready: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'trackingUrl', label: 'Tracking URL', example: 'https://track.example.com/123' },
  ],
  return_inspection_complete: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'status', label: 'Status', example: 'Approved' },
    { key: 'reason', label: 'Reason', example: 'Item in good condition' },
  ],
  refund_completed: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'refundAmount', label: 'Refund Amount', example: '49.99 EUR' },
  ],
  exchange_shipped: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'trackingUrl', label: 'Tracking URL', example: 'https://track.example.com/123' },
  ],
  ticket_created: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'ticketNumber', label: 'Ticket Number', example: 'TKT-001' },
    { key: 'subject', label: 'Subject', example: 'Question about return' },
  ],
  ticket_agent_reply: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'ticketNumber', label: 'Ticket Number', example: 'TKT-001' },
  ],
  ticket_resolved: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'ticketNumber', label: 'Ticket Number', example: 'TKT-001' },
    { key: 'subject', label: 'Subject', example: 'Question about return' },
  ],
  welcome_email: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
  ],
  voucher_issued: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'refundAmount', label: 'Voucher Amount', example: '49.99 EUR' },
  ],
  feedback_request: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'trackingUrl', label: 'Feedback URL', example: 'https://feedback.example.com/123' },
  ],
  return_reminder: [
    { key: 'customerName', label: 'Customer Name', example: 'Max Mustermann' },
    { key: 'returnNumber', label: 'Return Number', example: 'RET-2024-001' },
    { key: 'trackingUrl', label: 'Portal URL', example: 'https://returns.example.com/track' },
  ],
};

export type WizardStep = 'gallery' | 'editor' | 'design' | 'preview';
