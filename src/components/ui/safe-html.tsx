import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

const ALLOWED_TAGS = ['p', 'strong', 'em', 'b', 'i', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'br'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

interface SafeHtmlProps {
  html: string | undefined | null;
  className?: string;
}

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  if (!html) return null;

  // If the content is not HTML, wrap it in a <p> tag for backward compatibility
  const content = isHtml(html)
    ? html
    : `<p>${html.replace(/\n/g, '<br/>')}</p>`;

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  });

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
