/**
 * Email Template Defaults - 15 pre-built templates
 * Pure data file, no React dependencies.
 */
import type { RhNotificationEventType, EmailTemplateCategory } from '@/types/returns-hub';
import type { EmailDesignConfig } from './emailEditorTypes';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_LAYOUT = {
  maxWidth: 600,
  backgroundColor: '#f4f4f5',
  contentBackgroundColor: '#ffffff',
  borderRadius: 8,
  fontFamily: 'Arial, sans-serif',
  baseFontSize: 14,
};

const DEFAULT_HEADER = {
  enabled: true,
  showLogo: true,
  logoUrl: '',
  logoHeight: 40,
  backgroundColor: '#1e293b',
  textColor: '#ffffff',
  alignment: 'center' as const,
};

const DEFAULT_FOOTER = {
  enabled: true,
  text: 'This is an automated message. Please do not reply directly to this email.',
  links: [],
  backgroundColor: '#f8fafc',
  textColor: '#94a3b8',
};

interface DefaultTemplate {
  eventType: RhNotificationEventType;
  category: EmailTemplateCategory;
  name: string;
  description: string;
  subjectTemplate: string;
  bodyTemplate: string;
  sortOrder: number;
  designConfig: EmailDesignConfig;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ─── RETURNS (8) ──────────────────────────────
  {
    eventType: 'return_confirmed',
    category: 'returns',
    name: 'Return Confirmed',
    description: 'Sent when a customer submits a new return request',
    subjectTemplate: 'Return {{returnNumber}} - Confirmation',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been registered.\n\nReason: {{reason}}\n\nWe will process your request and keep you updated.\n\nBest regards',
    sortOrder: 1,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your return has been successfully registered. We will review your request and keep you updated on the progress.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Reason', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_approved',
    category: 'returns',
    name: 'Return Approved',
    description: 'Sent when a return is approved by an agent',
    subjectTemplate: 'Return {{returnNumber}} - Approved',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been approved.\n\nPlease ship the item(s) back to us. You can track the status at any time.\n\nBest regards',
    sortOrder: 2,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Great news! Your return {{returnNumber}} has been approved. Please ship the item(s) back to us at your earliest convenience.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Your Return', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_rejected',
    category: 'returns',
    name: 'Return Rejected',
    description: 'Sent when a return request is rejected',
    subjectTemplate: 'Return {{returnNumber}} - Rejected',
    bodyTemplate:
      'Dear {{customerName}},\n\nUnfortunately, your return {{returnNumber}} has been rejected.\n\nReason: {{reason}}\n\nIf you have any questions, please contact our support team.\n\nBest regards',
    sortOrder: 3,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Unfortunately, your return {{returnNumber}} has been rejected.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Reason', value: '{{reason}}', backgroundColor: '#fef2f2', borderColor: '#dc2626' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you have any questions, please contact our support team.' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_shipped',
    category: 'returns',
    name: 'Return Shipped',
    description: 'Sent when the return shipment status is updated',
    subjectTemplate: 'Return {{returnNumber}} - Shipment Update',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} shipment has been updated.\n\nTracking: {{trackingUrl}}\n\nBest regards',
    sortOrder: 4,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your return {{returnNumber}} shipment status has been updated.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Status', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Shipment', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_label_ready',
    category: 'returns',
    name: 'Label Ready',
    description: 'Sent when a return shipping label is generated',
    subjectTemplate: 'Return {{returnNumber}} - Your Label is Ready',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return label for {{returnNumber}} is ready.\n\nPlease download and print the label, then ship the item(s) back.\n\nBest regards',
    sortOrder: 5,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your return shipping label for {{returnNumber}} is ready. Please download and print the label, then attach it to your package.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Download Label', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_inspection_complete',
    category: 'returns',
    name: 'Inspection Complete',
    description: 'Sent when the inspection of returned items is completed',
    subjectTemplate: 'Return {{returnNumber}} - Inspection Complete',
    bodyTemplate:
      'Dear {{customerName}},\n\nThe inspection for your return {{returnNumber}} has been completed.\n\nResult: {{status}}\n{{reason}}\n\nBest regards',
    sortOrder: 6,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'The inspection of your return {{returnNumber}} has been completed.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Inspection Result', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Details', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'refund_completed',
    category: 'returns',
    name: 'Refund Completed',
    description: 'Sent when a refund has been processed',
    subjectTemplate: 'Return {{returnNumber}} - Refund Completed',
    bodyTemplate:
      'Dear {{customerName}},\n\nThe refund for your return {{returnNumber}} has been completed.\n\nAmount: {{refundAmount}}\n\nThe amount will be credited to your original payment method.\n\nBest regards',
    sortOrder: 7,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'The refund for your return {{returnNumber}} has been completed. The amount will be credited to your original payment method.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Refund Amount', value: '{{refundAmount}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'exchange_shipped',
    category: 'returns',
    name: 'Exchange Shipped',
    description: 'Sent when an exchange item has been shipped',
    subjectTemplate: 'Return {{returnNumber}} - Exchange Shipped',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour exchange item for return {{returnNumber}} has been shipped.\n\nTracking: {{trackingUrl}}\n\nBest regards',
    sortOrder: 8,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your exchange item for return {{returnNumber}} has been shipped and is on its way!' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Shipment', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },

  // ─── TICKETS (3) ──────────────────────────────
  {
    eventType: 'ticket_created',
    category: 'tickets',
    name: 'Ticket Created',
    description: 'Sent when a new support ticket is created',
    subjectTemplate: 'Ticket {{ticketNumber}} - {{subject}}',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour support ticket {{ticketNumber}} has been created.\n\nSubject: {{subject}}\n\nOur team will respond as soon as possible.\n\nBest regards',
    sortOrder: 9,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your support ticket has been created. Our team will respond as soon as possible.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Subject', value: '{{subject}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'ticket_agent_reply',
    category: 'tickets',
    name: 'Agent Reply',
    description: 'Sent when an agent replies to a ticket',
    subjectTemplate: 'Ticket {{ticketNumber}} - New Reply',
    bodyTemplate:
      'Dear {{customerName}},\n\nThere is a new reply on your support ticket {{ticketNumber}}.\n\nPlease check your ticket for the latest update.\n\nBest regards',
    sortOrder: 10,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'There is a new reply on your support ticket {{ticketNumber}}. Please check your ticket for the latest update.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'ticket_resolved',
    category: 'tickets',
    name: 'Ticket Resolved',
    description: 'Sent when a support ticket is resolved',
    subjectTemplate: 'Ticket {{ticketNumber}} - Resolved',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour support ticket {{ticketNumber}} has been resolved.\n\nSubject: {{subject}}\n\nIf you need further help, feel free to open a new ticket.\n\nBest regards',
    sortOrder: 11,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your support ticket {{ticketNumber}} regarding "{{subject}}" has been resolved.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you need further help, feel free to open a new ticket.' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },

  // ─── GENERAL (4) ──────────────────────────────
  {
    eventType: 'welcome_email',
    category: 'general',
    name: 'Welcome Email',
    description: 'Sent to new customers upon first interaction',
    subjectTemplate: 'Welcome, {{customerName}}!',
    bodyTemplate:
      'Dear {{customerName}},\n\nWelcome! We are glad to have you as a customer.\n\nIf you ever need to return an item, our returns portal makes it quick and easy.\n\nBest regards',
    sortOrder: 12,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Welcome! We are glad to have you as a customer. If you ever need to return an item, our returns portal makes it quick and easy.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'voucher_issued',
    category: 'general',
    name: 'Voucher Issued',
    description: 'Sent when a store credit voucher is issued',
    subjectTemplate: 'Your Voucher for Return {{returnNumber}}',
    bodyTemplate:
      'Dear {{customerName}},\n\nA voucher has been issued for your return {{returnNumber}}.\n\nVoucher Amount: {{refundAmount}}\n\nYou can use this voucher on your next purchase.\n\nBest regards',
    sortOrder: 13,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'A store credit voucher has been issued for your return {{returnNumber}}. You can use this voucher on your next purchase.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Voucher Amount', value: '{{refundAmount}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'feedback_request',
    category: 'general',
    name: 'Feedback Request',
    description: 'Sent after a return is completed to request feedback',
    subjectTemplate: 'How was your experience with Return {{returnNumber}}?',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been completed. We would love to hear your feedback!\n\nPlease take a moment to share your experience.\n\nBest regards',
    sortOrder: 14,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Your return {{returnNumber}} has been completed. We would love to hear your feedback!' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Share Feedback', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
  {
    eventType: 'return_reminder',
    category: 'general',
    name: 'Return Reminder',
    description: 'Sent as a reminder to ship back pending returns',
    subjectTemplate: 'Reminder: Return {{returnNumber}} - Please Ship Back',
    bodyTemplate:
      'Dear {{customerName}},\n\nThis is a friendly reminder that your return {{returnNumber}} is still pending. Please ship the item(s) back to us.\n\nBest regards',
    sortOrder: 15,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'This is a friendly reminder that your return {{returnNumber}} is still pending. Please ship the item(s) back to us at your earliest convenience.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'View Return Details', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards' },
      ],
      footer: DEFAULT_FOOTER,
    },
  },
];

export function getDefaultTemplate(eventType: RhNotificationEventType) {
  return DEFAULT_TEMPLATES.find((t) => t.eventType === eventType);
}

export function getDefaultDesignConfig(): EmailDesignConfig {
  return {
    layout: { ...DEFAULT_LAYOUT },
    header: { ...DEFAULT_HEADER },
    blocks: [
      { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
      { type: 'spacer', id: makeId(), height: 8 },
      { type: 'text', id: makeId(), content: 'Your email content here.' },
      { type: 'spacer', id: makeId(), height: 16 },
      { type: 'text', id: makeId(), content: 'Best regards' },
    ],
    footer: { ...DEFAULT_FOOTER },
  };
}
