import { useMemo } from 'react';

interface AIStreamingTextProps {
  text: string;
  isStreaming: boolean;
}

function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-base mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-lg mt-4 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-xl mt-4 mb-2">$1</h2>')
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks (double newline = paragraph break)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export function AIStreamingText({ text, isStreaming }: AIStreamingTextProps) {
  const html = useMemo(() => renderMarkdown(text), [text]);

  if (!text && !isStreaming) return null;

  return (
    <div className="relative">
      <div
        className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_li]:my-0.5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
      )}
    </div>
  );
}
