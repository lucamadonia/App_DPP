import { describe, expect, it } from 'vitest';
import { renderWorkflowBody, renderWorkflowValue } from '../../supabase/functions/_shared/workflow-webhook';

describe('workflow webhook rendering', () => {
  it('escapes user values inside structured JSON', () => {
    const text = 'Customer "quoted"\nnew line';
    const rendered = renderWorkflowBody('{"name":"{{customer.firstName}}","count":2}', { customer: { firstName: text } });
    expect(JSON.parse(rendered)).toEqual({ name: text, count: 2 });
  });
  it('supports nested arrays and existing return variables', () => {
    expect(JSON.parse(renderWorkflowBody({ values: ['{{returnNumber}}'] }, { return: { returnNumber: 'RET-001' } }))).toEqual({ values: ['RET-001'] });
    expect(renderWorkflowValue('{{customerName}}: {{status}}', { customer: { firstName: 'QA', lastName: 'Test' }, ticket: { status: 'open' } })).toBe('QA Test: open');
  });
  it('does not resolve inherited object properties', () => {
    expect(renderWorkflowValue('{{constructor.name}} {{customer.toString}}', { customer: {} })).toBe(' ');
  });
});
