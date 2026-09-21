function fieldValue(context: Record<string, unknown>, key: string): string {
  if (key === 'customerName') return [fieldValue(context, 'customer.firstName'), fieldValue(context, 'customer.lastName')].filter(Boolean).join(' ');
  const aliases: Record<string, string> = { returnNumber: 'return.returnNumber', ticketNumber: 'ticket.ticketNumber', status: context.return ? 'return.status' : 'ticket.status' };
  const parts = (aliases[key] || key).split('.');
  let value: unknown = context;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, part)) return '';
    value = (value as Record<string, unknown>)[part];
  }
  return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function renderWorkflowValue(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => fieldValue(context, key));
}

export function renderWorkflowBody(body: unknown, context: Record<string, unknown>): string {
  let parsed = body;
  if (typeof body === 'string') {
    try { parsed = JSON.parse(body); }
    catch { return renderWorkflowValue(body, context); }
  }
  const render = (value: unknown): unknown => {
    if (typeof value === 'string') return renderWorkflowValue(value, context);
    if (Array.isArray(value)) return value.map(render);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, render(v)]));
    return value;
  };
  return JSON.stringify(render(parsed));
}
