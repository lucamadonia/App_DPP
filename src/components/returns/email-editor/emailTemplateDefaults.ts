/**
 * Email Template Defaults - 15 pre-built templates with EN + DE locale support
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

const DEFAULT_FOOTER_EN = {
  enabled: true,
  text: 'This is an automated message. Please do not reply directly to this email.',
  links: [],
  backgroundColor: '#f8fafc',
  textColor: '#94a3b8',
};

const DEFAULT_FOOTER_DE = {
  enabled: true,
  text: 'Dies ist eine automatische Nachricht. Bitte antworten Sie nicht direkt auf diese E-Mail.',
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
        { type: 'text', id: makeId(), content: 'Thank you for submitting your return request. We have successfully registered your return and our team will review it promptly.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Reason', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'We will notify you as soon as your return has been reviewed. If you have any questions in the meantime, please do not hesitate to contact our support team.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Bestätigung',
          footerText: 'Dies ist eine automatische Nachricht. Bitte antworten Sie nicht direkt auf diese E-Mail.',
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Vielen Dank für Ihre Retoureneinreichung. Wir haben Ihre Retoure erfolgreich registriert und unser Team wird diese zeitnah prüfen.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'info-box', id: makeId(), label: 'Grund', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Wir benachrichtigen Sie, sobald Ihre Retoure geprüft wurde. Bei Fragen steht Ihnen unser Kundenservice gerne zur Verfügung.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Great news! Your return has been approved. Please ship the item(s) back to us at your earliest convenience using the provided shipping instructions.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Your Return', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Once we receive and inspect the returned item(s), we will process your request accordingly.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Genehmigt',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Gute Nachrichten! Ihre Retoure wurde genehmigt. Bitte senden Sie den/die Artikel so bald wie möglich anhand der Versandanweisungen an uns zurück.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Retoure verfolgen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sobald wir den/die retournierten Artikel erhalten und geprüft haben, werden wir Ihren Antrag entsprechend bearbeiten.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'We regret to inform you that your return request has been reviewed and unfortunately could not be approved.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#fef2f2', borderColor: '#dc2626' },
        { type: 'info-box', id: makeId(), label: 'Reason', value: '{{reason}}', backgroundColor: '#fef2f2', borderColor: '#dc2626' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you believe this decision was made in error or have any questions, please do not hesitate to contact our support team. We are happy to assist you.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Abgelehnt',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Leider müssen wir Ihnen mitteilen, dass Ihr Retourenantrag geprüft wurde und bedauerlicherweise nicht genehmigt werden konnte.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#fef2f2', borderColor: '#dc2626' },
            { type: 'info-box', id: makeId(), label: 'Grund', value: '{{reason}}', backgroundColor: '#fef2f2', borderColor: '#dc2626' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sollten Sie Fragen haben oder der Meinung sein, dass diese Entscheidung irrtümlich getroffen wurde, wenden Sie sich bitte an unseren Kundenservice. Wir helfen Ihnen gerne weiter.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'We have received a shipment update for your return. You can track the current delivery status using the link below.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Status', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Shipment', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Versandupdate',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Wir haben ein Versandupdate für Ihre Retoure erhalten. Den aktuellen Lieferstatus können Sie über den untenstehenden Link verfolgen.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'info-box', id: makeId(), label: 'Status', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Sendung verfolgen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Your return shipping label for {{returnNumber}} has been generated and is ready for download. Please print the label and attach it to your package before shipping.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Download Label', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Please ensure the items are securely packed before shipping. We look forward to receiving your return.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Ihr Versandlabel ist bereit',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Ihr Retourenversandlabel für {{returnNumber}} wurde erstellt und steht zum Download bereit. Bitte drucken Sie das Label aus und bringen Sie es an Ihrem Paket an.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Label herunterladen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Bitte stellen Sie sicher, dass die Artikel sicher verpackt sind. Wir freuen uns auf den Eingang Ihrer Retoure.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'We have completed the inspection of the item(s) from your return {{returnNumber}}. Please find the results below.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Inspection Result', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Details', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'We will now proceed with the next steps based on the inspection outcome. You will receive a separate notification once the process is complete.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Prüfung abgeschlossen',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Die Prüfung der Artikel aus Ihrer Retoure {{returnNumber}} wurde abgeschlossen. Nachfolgend finden Sie die Ergebnisse.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Prüfergebnis', value: '{{status}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'info-box', id: makeId(), label: 'Details', value: '{{reason}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Basierend auf dem Prüfergebnis werden wir die nächsten Schritte einleiten. Sie erhalten eine separate Benachrichtigung, sobald der Vorgang abgeschlossen ist.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'We are pleased to inform you that the refund for your return {{returnNumber}} has been successfully processed.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Refund Amount', value: '{{refundAmount}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'The refund amount will be credited to your original payment method. Please allow 5-10 business days for the amount to appear in your account.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Thank you for your patience throughout this process.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Erstattung abgeschlossen',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Wir freuen uns, Ihnen mitteilen zu können, dass die Erstattung für Ihre Retoure {{returnNumber}} erfolgreich veranlasst wurde.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Erstattungsbetrag', value: '{{refundAmount}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Der Erstattungsbetrag wird Ihrem ursprünglichen Zahlungsmittel gutgeschrieben. Bitte rechnen Sie mit einer Bearbeitungszeit von 5-10 Werktagen, bis der Betrag auf Ihrem Konto erscheint.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Vielen Dank für Ihre Geduld während dieses Vorgangs.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Great news! Your exchange item for return {{returnNumber}} has been shipped and is on its way to you.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Track Shipment', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'You can track the delivery status using the link above. If you have any questions, our support team is here to help.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Umtauschartikel versendet',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Gute Nachrichten! Ihr Umtauschartikel für Retoure {{returnNumber}} wurde versendet und ist auf dem Weg zu Ihnen.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Sendung verfolgen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Den Lieferstatus können Sie über den obenstehenden Link verfolgen. Bei Fragen steht Ihnen unser Kundenservice gerne zur Verfügung.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Your support ticket has been successfully created. Our team has been notified and will respond to your inquiry as soon as possible.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'info-box', id: makeId(), label: 'Subject', value: '{{subject}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'You will receive an email notification when an agent responds to your ticket. Please do not create duplicate tickets for the same issue.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Support Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Ticket {{ticketNumber}} - {{subject}}',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Ihr Support-Ticket wurde erfolgreich erstellt. Unser Team wurde benachrichtigt und wird sich schnellstmöglich um Ihre Anfrage kümmern.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Ticketnummer', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'info-box', id: makeId(), label: 'Betreff', value: '{{subject}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sie erhalten eine E-Mail-Benachrichtigung, sobald ein Mitarbeiter auf Ihr Ticket antwortet. Bitte erstellen Sie keine doppelten Tickets für dasselbe Anliegen.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Support-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'A member of our support team has replied to your ticket {{ticketNumber}}. Please check your ticket for the latest update.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you have additional questions, you can reply directly within the ticket thread.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Support Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Ticket {{ticketNumber}} - Neue Antwort',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Ein Mitarbeiter unseres Support-Teams hat auf Ihr Ticket {{ticketNumber}} geantwortet. Bitte prüfen Sie Ihr Ticket für die neueste Aktualisierung.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Ticketnummer', value: '{{ticketNumber}}', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Falls Sie weitere Fragen haben, können Sie direkt im Ticket-Thread antworten.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Support-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'We are pleased to let you know that your support ticket {{ticketNumber}} regarding "{{subject}}" has been resolved.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Ticket Number', value: '{{ticketNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you need further assistance or the issue persists, feel free to open a new support ticket. We are always happy to help.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Thank you for contacting us!' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Support Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Ticket {{ticketNumber}} - Gelöst',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Wir freuen uns, Ihnen mitteilen zu können, dass Ihr Support-Ticket {{ticketNumber}} zum Thema "{{subject}}" gelöst wurde.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Ticketnummer', value: '{{ticketNumber}}', backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sollten Sie weitere Unterstützung benötigen oder das Problem weiterhin bestehen, können Sie jederzeit ein neues Support-Ticket eröffnen. Wir helfen Ihnen gerne.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Vielen Dank für Ihre Kontaktaufnahme!' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Support-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Welcome! We are delighted to have you as a customer. Thank you for choosing us.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you ever need to return an item, our returns portal makes the process quick and hassle-free. Simply visit our website and follow the guided return wizard.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'We look forward to serving you and ensuring the best possible experience.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Customer Service Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Willkommen, {{customerName}}!',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Herzlich willkommen! Wir freuen uns, Sie als Kund(in) begrüßen zu dürfen. Vielen Dank, dass Sie sich für uns entschieden haben.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sollten Sie einmal einen Artikel zurückgeben müssen, macht unser Retourenportal den Vorgang schnell und unkompliziert. Besuchen Sie einfach unsere Website und folgen Sie dem geführten Retouren-Assistenten.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Wir freuen uns darauf, Ihnen den bestmöglichen Service zu bieten.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Kundenservice-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'A store credit voucher has been issued as part of your return {{returnNumber}}. You can redeem this voucher on your next purchase.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Voucher Amount', value: '{{refundAmount}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'The voucher is valid for 12 months from the date of issue. Simply enter the voucher code at checkout to apply the discount.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Thank you for your continued support!' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Customer Service Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Ihr Gutschein für Retoure {{returnNumber}}',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Im Rahmen Ihrer Retoure {{returnNumber}} wurde ein Gutschein für Sie ausgestellt. Diesen können Sie bei Ihrem nächsten Einkauf einlösen.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Gutscheinbetrag', value: '{{refundAmount}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Der Gutschein ist 12 Monate ab Ausstellungsdatum gültig. Geben Sie den Gutscheincode einfach beim Checkout ein, um den Rabatt anzuwenden.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Vielen Dank für Ihr Vertrauen!' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Kundenservice-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'Your return {{returnNumber}} has been completed. We hope the process was smooth and satisfactory.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'We would love to hear your feedback! Your experience helps us improve our service for all customers.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'Share Your Feedback', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Thank you for taking the time to share your thoughts. It only takes a moment!' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Customer Service Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Wie war Ihr Erlebnis mit Retoure {{returnNumber}}?',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Ihre Retoure {{returnNumber}} wurde abgeschlossen. Wir hoffen, der Ablauf war reibungslos und zufriedenstellend.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Wir würden uns über Ihr Feedback freuen! Ihre Erfahrung hilft uns, unseren Service für alle Kunden zu verbessern.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Feedback abgeben', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Vielen Dank, dass Sie sich einen Moment Zeit nehmen. Es dauert nur wenige Augenblicke!' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Kundenservice-Team' },
          ],
        },
      },
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
        { type: 'text', id: makeId(), content: 'This is a friendly reminder that your return {{returnNumber}} is still pending. Please ship the item(s) back to us at your earliest convenience so we can process your return.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'button', id: makeId(), text: 'View Return Details', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you have already shipped the items, please disregard this message. If you have any questions or need assistance, feel free to contact us.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Erinnerung: Retoure {{returnNumber}} - Bitte zurücksenden',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Dies ist eine freundliche Erinnerung, dass Ihre Retoure {{returnNumber}} noch aussteht. Bitte senden Sie den/die Artikel baldmöglichst an uns zurück, damit wir Ihre Retoure bearbeiten können.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'button', id: makeId(), text: 'Retourendetails anzeigen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Sollten Sie die Artikel bereits versendet haben, ignorieren Sie bitte diese Nachricht. Bei Fragen oder falls Sie Hilfe benötigen, kontaktieren Sie uns gerne.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
    },
  },
  {
    eventType: 'return_cancelled',
    category: 'returns',
    name: 'Return Cancelled',
    description: 'Sent when a return is cancelled by admin or customer',
    subjectTemplate: 'Return {{returnNumber}} - Cancelled',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been cancelled.\n\nReason: {{reason}}\n\nIf you have any questions, please contact our support team.\n\nBest regards',
    sortOrder: 16,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Dear {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 8 },
        { type: 'text', id: makeId(), content: 'We would like to inform you that your return has been cancelled.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Return Number', value: '{{returnNumber}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'info-box', id: makeId(), label: 'Reason', value: '{{reason}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'If you would like to create a new return or have any questions, please do not hesitate to contact our support team.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Best regards,\nYour Returns Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        de: {
          subjectTemplate: 'Retoure {{returnNumber}} - Storniert',
          footerText: DEFAULT_FOOTER_DE.text,
          blocks: [
            { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 8 },
            { type: 'text', id: makeId(), content: 'Wir möchten Sie darüber informieren, dass Ihre Retoure storniert wurde.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Retourennummer', value: '{{returnNumber}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
            { type: 'info-box', id: makeId(), label: 'Grund', value: '{{reason}}', backgroundColor: '#fefce8', borderColor: '#d97706' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Wenn Sie eine neue Retoure erstellen möchten oder Fragen haben, wenden Sie sich bitte an unseren Kundenservice.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen,\nIhr Retouren-Team' },
          ],
        },
      },
    },
  },

  // ─── SHIPMENT LIFECYCLE (3) ───────────────────
  // Triggered by wh_shipments status-change. All three carry {{shipmentNumber}}
  // and a {{trackingUrl}} that points at our branded /t/{token} page.
  {
    eventType: 'shipment_packed',
    category: 'shipment',
    name: 'Order Being Packed',
    description: 'Anti-anxiety message — we picked + packed, awaiting carrier handoff',
    subjectTemplate: 'Wir packen deine Bestellung {{shipmentNumber}}',
    bodyTemplate:
      'Hallo {{customerName}},\n\nwir packen deine Bestellung gerade liebevoll zusammen. Sobald sie DHL übergeben ist, bekommst du eine Versandbestätigung mit Tracking-Link.\n\nBis gleich!\nDein Fambliss-Team',
    sortOrder: 100,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'wir packen deine Bestellung gerade liebevoll zusammen. Sobald das Paket DHL übergeben ist, bekommst du die Versandbestätigung mit deinem Live-Tracking-Link.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Bestellung', value: '{{shipmentNumber}}', backgroundColor: '#f8f4ee', borderColor: '#c9a661' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Bis gleich,\ndein Fambliss-Team 💛' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'We are packing your order {{shipmentNumber}}',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'We are carefully packing your order. Once handed over to DHL you will receive the shipping confirmation with a live tracking link.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Order', value: '{{shipmentNumber}}', backgroundColor: '#f8f4ee', borderColor: '#c9a661' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'See you soon,\nthe Fambliss team 💛' },
          ],
        },
      },
    },
  },
  {
    eventType: 'shipment_shipped',
    category: 'shipment',
    name: 'Shipment Shipped',
    description: 'Sent the moment DHL scans the label — links to Trackbliss tracking page',
    subjectTemplate: 'Deine Bestellung {{shipmentNumber}} ist unterwegs',
    bodyTemplate:
      'Hallo {{customerName}},\n\ndein Paket ist unterwegs zu dir! Hier dein Live-Tracking-Link: {{trackingUrl}}',
    sortOrder: 110,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'dein Paket ist jetzt offiziell unterwegs zu dir. Verfolge den Status live mit dem Button unten — du siehst alle Stationen, Bilder deiner Produkte und kannst direkt unseren Support erreichen, falls etwas unklar ist.' },
        { type: 'spacer', id: makeId(), height: 20 },
        { type: 'button', id: makeId(), text: 'Sendung verfolgen', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#c9a661', textColor: '#ffffff', borderRadius: 8 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'info-box', id: makeId(), label: 'Sendungsnummer', value: '{{shipmentNumber}}', backgroundColor: '#f8f4ee', borderColor: '#c9a661' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Wir freuen uns für dich,\ndein Fambliss-Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'Your order {{shipmentNumber}} is on its way',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'Your parcel is officially on its way. Track it live with the button below — see every step, the products inside, and reach our support right from the tracking page.' },
            { type: 'spacer', id: makeId(), height: 20 },
            { type: 'button', id: makeId(), text: 'Track shipment', url: '{{trackingUrl}}', alignment: 'center', backgroundColor: '#c9a661', textColor: '#ffffff', borderRadius: 8 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'info-box', id: makeId(), label: 'Tracking number', value: '{{shipmentNumber}}', backgroundColor: '#f8f4ee', borderColor: '#c9a661' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'See you soon,\nthe Fambliss team' },
          ],
        },
      },
    },
  },
  {
    eventType: 'shipment_delivered',
    category: 'shipment',
    name: 'Shipment Delivered',
    description: 'Sent on DHL delivery confirmation — celebrates arrival + previews first steps',
    subjectTemplate: 'Dein Paket ist da! Erste Schritte mit Fambliss',
    bodyTemplate:
      'Hallo {{customerName}},\n\ndein Paket wurde zugestellt. Hier sind ein paar Tipps für den ersten Tag mit deinen Produkten.\n\nMorgen schicken wir dir die ersten Mini-Übungen pro Produkt.',
    sortOrder: 120,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: '🎉 Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'dein Paket ist angekommen! Wir hoffen, du freust dich genauso wie wir, dass es bei dir ist.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Bevor du loslegst — drei kleine Tipps:\n\n• Pack alles ruhig aus, lass dein Kind dabei sein\n• Räum dir eine Ecke frei wo die Magnetwand hin kann\n• Lade die Lichter direkt einmal voll, dann sind sie morgen einsatzbereit' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Morgen schicken wir dir per Mail die ersten Mini-Übungen pro Produkt — du musst nichts vorbereiten, einfach klicken und loslegen.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Viel Spaß,\ndein Fambliss-Team 💛' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'Your parcel arrived! First steps with Fambliss',
          blocks: [
            { type: 'text', id: makeId(), content: '🎉 Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'Your parcel is with you. We hope you are as excited as we are.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Three small tips before you start:\n\n• Unpack together with your child\n• Find a wall spot for the magnetic board\n• Charge the lights once, they will be ready tomorrow' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Tomorrow we will send you the first mini-exercises per product — no prep needed, just click and go.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Have fun,\nthe Fambliss team 💛' },
          ],
        },
      },
    },
  },

  // ─── ENGAGEMENT (4) ───────────────────────────
  // Triggered by daily cron based on delivered_at + N days. The
  // {{productsHtml}} placeholder is rendered by the shipment-engagement-mails
  // edge function and contains one card per product in the shipment with
  // image + onboarding bullets pulled from products.onboarding_steps.
  {
    eventType: 'engagement_day_1',
    category: 'shipment',
    name: 'Engagement — Day 1 onboarding',
    description: 'Sent 1 day after delivered_at — concrete first exercises per product',
    subjectTemplate: 'Erste Übungen mit deinen Fambliss-Produkten',
    bodyTemplate:
      'Hallo {{customerName}},\n\nhier sind die ersten konkreten Schritte für jedes deiner Produkte.\n\n{{productsHtml}}',
    sortOrder: 130,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'wir hoffen, das Auspacken hat gestern Spaß gemacht. Heute starten wir mit den ersten kleinen Übungen — alles 5-Minuten-fit, alles ohne Vorbereitung.' },
        { type: 'spacer', id: makeId(), height: 20 },
        { type: 'text', id: makeId(), content: '{{productsHtml}}' },
        { type: 'spacer', id: makeId(), height: 20 },
        { type: 'text', id: makeId(), content: 'Wir hören in einer Woche wieder von dir — bis dahin alles Gute!\n\nDein Fambliss-Team' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'First exercises with your Fambliss products',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'We hope unpacking was fun. Today we kick off with the first small exercises — all 5-minute friendly, no prep needed.' },
            { type: 'spacer', id: makeId(), height: 20 },
            { type: 'text', id: makeId(), content: '{{productsHtml}}' },
            { type: 'spacer', id: makeId(), height: 20 },
            { type: 'text', id: makeId(), content: 'We will check in again in a week — all the best until then!\n\nThe Fambliss team' },
          ],
        },
      },
    },
  },
  {
    eventType: 'engagement_day_7',
    category: 'shipment',
    name: 'Engagement — Day 7 check-in',
    description: 'Sent 7 days after delivery — friendly check-in + invitation to share',
    subjectTemplate: 'Wie läuft es bei euch?',
    bodyTemplate:
      'Hallo {{customerName}},\n\neine Woche mit deinen Fambliss-Produkten — wie läuft es bei euch? Antworte direkt auf diese Mail, wir lesen jede.',
    sortOrder: 140,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'eine Woche mit Fambliss — wie war sie? Gab es einen Moment, der euch zum Lachen gebracht hat? Eine Routine, die plötzlich klappt? Oder etwas, das noch nicht so läuft wie erhofft?' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Antworte direkt auf diese Mail — wir lesen jede Nachricht persönlich.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Bis bald,\ndein Fambliss-Team 💛' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'How is it going so far?',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'One week of Fambliss — how has it been? Any moment that made you laugh? A routine that suddenly works? Or something that is not yet clicking?' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Just reply to this email — we read every message personally.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Speak soon,\nthe Fambliss team 💛' },
          ],
        },
      },
    },
  },
  {
    eventType: 'engagement_day_14',
    category: 'shipment',
    name: 'Engagement — Day 14 review request',
    description: 'Sent 14 days after delivery — asks for a product review',
    subjectTemplate: 'Würdest du uns mit einer kurzen Bewertung helfen?',
    bodyTemplate:
      'Hallo {{customerName}},\n\nzwei Wochen mit deinen Fambliss-Produkten. Wenn du magst, hilf anderen Familien mit einer kurzen Bewertung.\n\n{{productsHtml}}',
    sortOrder: 150,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'zwei Wochen Fambliss bei euch — wir hoffen, ihr habt euch eingelebt. Wenn dir etwas richtig gut gefällt, würdest du uns mit einer kurzen Bewertung helfen?' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Andere Eltern lesen genau diese Erfahrungsberichte, bevor sie sich entscheiden — dein Wort hat Gewicht.' },
        { type: 'spacer', id: makeId(), height: 20 },
        { type: 'text', id: makeId(), content: '{{productsHtml}}' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Danke von Herzen,\ndein Fambliss-Team 💛' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'Would you help us with a quick review?',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'Two weeks of Fambliss in your home — we hope you have settled in. If something really clicks for you, would you help us with a quick review?' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Other parents read exactly these stories before deciding — your words matter.' },
            { type: 'spacer', id: makeId(), height: 20 },
            { type: 'text', id: makeId(), content: '{{productsHtml}}' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'Thank you from the bottom of our hearts,\nthe Fambliss team 💛' },
          ],
        },
      },
    },
  },
  {
    eventType: 'engagement_day_30',
    category: 'shipment',
    name: 'Engagement — Day 30 community invite',
    description: 'Sent 30 days after delivery — invites to the Idea Board to co-create',
    subjectTemplate: 'Was würdest du an Fambliss verbessern?',
    bodyTemplate:
      'Hallo {{customerName}},\n\nein Monat mit Fambliss. Wir bauen die Produkte mit unserer Community weiter — sag uns, was dir fehlt!',
    sortOrder: 160,
    designConfig: {
      layout: DEFAULT_LAYOUT,
      header: DEFAULT_HEADER,
      blocks: [
        { type: 'text', id: makeId(), content: 'Hallo {{customerName}},' },
        { type: 'spacer', id: makeId(), height: 12 },
        { type: 'text', id: makeId(), content: 'ein ganzer Monat mit Fambliss — wir hoffen, ihr habt eure Routinen gefunden. Wir bauen unsere Produkte gemeinsam mit unserer Community weiter. Wenn dir etwas fehlt, eine Idee einfällt, oder du etwas ganz anders machen würdest:' },
        { type: 'spacer', id: makeId(), height: 20 },
        { type: 'button', id: makeId(), text: 'Idee einreichen oder abstimmen', url: 'https://shop.fambliss.de/pages/ideen', alignment: 'center', backgroundColor: '#c9a661', textColor: '#ffffff', borderRadius: 8 },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Wir lesen alles und antworten persönlich. Die besten Ideen werden gemeinsam zur Abstimmung gestellt — und wenn dein Vorschlag gewinnt, bekommst du das fertige Produkt geschenkt.' },
        { type: 'spacer', id: makeId(), height: 16 },
        { type: 'text', id: makeId(), content: 'Bis bald,\ndein Fambliss-Team 💛' },
      ],
      footer: DEFAULT_FOOTER_EN,
      locales: {
        en: {
          subjectTemplate: 'What would you improve about Fambliss?',
          blocks: [
            { type: 'text', id: makeId(), content: 'Hi {{customerName}},' },
            { type: 'spacer', id: makeId(), height: 12 },
            { type: 'text', id: makeId(), content: 'A full month with Fambliss — we hope you have found your routines. We build our products together with our community. If something is missing, an idea comes to mind, or you would do things differently:' },
            { type: 'spacer', id: makeId(), height: 20 },
            { type: 'button', id: makeId(), text: 'Submit or vote on an idea', url: 'https://shop.fambliss.de/pages/ideas', alignment: 'center', backgroundColor: '#c9a661', textColor: '#ffffff', borderRadius: 8 },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'We read everything and reply personally. The best ideas go up for community vote — and if yours wins, you get the finished product for free.' },
            { type: 'spacer', id: makeId(), height: 16 },
            { type: 'text', id: makeId(), content: 'See you soon,\nthe Fambliss team 💛' },
          ],
        },
      },
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
    footer: { ...DEFAULT_FOOTER_EN },
    locales: {
      de: {
        subjectTemplate: '',
        footerText: DEFAULT_FOOTER_DE.text,
        blocks: [
          { type: 'text', id: makeId(), content: 'Sehr geehrte(r) {{customerName}},' },
          { type: 'spacer', id: makeId(), height: 8 },
          { type: 'text', id: makeId(), content: 'Ihr E-Mail-Inhalt hier.' },
          { type: 'spacer', id: makeId(), height: 16 },
          { type: 'text', id: makeId(), content: 'Mit freundlichen Grüßen' },
        ],
      },
    },
  };
}
