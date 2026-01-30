import { useMemo } from 'react';

interface AIStreamingTextProps {
  text: string;
  isStreaming: boolean;
}

type InlineSegment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'boldItalic'; content: string }
  | { type: 'code'; content: string };

type Block =
  | { type: 'heading'; level: number; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'codeBlock'; lang: string; content: string };

function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Match bold-italic, bold, italic, inline code
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      segments.push({ type: 'boldItalic', content: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'bold', content: match[3] });
    } else if (match[4]) {
      segments.push({ type: 'italic', content: match[4] });
    } else if (match[5]) {
      segments.push({ type: 'code', content: match[5] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

function InlineContent({ text }: { text: string }) {
  const segments = parseInlineSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'boldItalic':
            return <strong key={i}><em>{seg.content}</em></strong>;
          case 'bold':
            return <strong key={i}>{seg.content}</strong>;
          case 'italic':
            return <em key={i}>{seg.content}</em>;
          case 'code':
            return (
              <code
                key={i}
                className="bg-slate-100 dark:bg-slate-800 text-[0.85em] px-1.5 py-0.5 rounded font-mono"
              >
                {seg.content}
              </code>
            );
          default:
            return <span key={i}>{seg.content}</span>;
        }
      })}
    </>
  );
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'codeBlock', lang, content: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,3}\s/) &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].startsWith('```')
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

function BlockRenderer({ block, index }: { block: Block; index: number }) {
  const animStyle = { animationDelay: `${index * 30}ms`, animationFillMode: 'both' as const };

  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level + 1}` as 'h2' | 'h3' | 'h4');
      const sizeClass = block.level === 1
        ? 'text-base font-bold'
        : block.level === 2
          ? 'text-[0.95rem] font-semibold'
          : 'text-sm font-semibold';
      return (
        <div className="animate-fade-in-up" style={animStyle}>
          <Tag className={`${sizeClass} mt-4 mb-1.5 pl-3 border-l-[3px] border-blue-500`}>
            <InlineContent text={block.content} />
          </Tag>
        </div>
      );
    }

    case 'paragraph':
      return (
        <div className="animate-fade-in-up" style={animStyle}>
          <p className="text-sm leading-relaxed my-1.5">
            {block.content.split('\n').map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <InlineContent text={line} />
              </span>
            ))}
          </p>
        </div>
      );

    case 'ul':
      return (
        <div className="animate-fade-in-up" style={animStyle}>
          <ul className="space-y-1 my-2">
            {block.items.map((item, li) => (
              <li key={li} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span><InlineContent text={item} /></span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'ol':
      return (
        <div className="animate-fade-in-up" style={animStyle}>
          <ol className="space-y-1.5 my-2">
            {block.items.map((item, li) => (
              <li key={li} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[0.7rem] font-semibold text-white">
                  {li + 1}
                </span>
                <span className="pt-0.5"><InlineContent text={item} /></span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'codeBlock':
      return (
        <div className="animate-fade-in-up" style={animStyle}>
          <pre className="my-2 rounded-lg bg-slate-900 dark:bg-slate-950 p-3 overflow-x-auto">
            <code className="text-xs font-mono text-slate-100 leading-relaxed">
              {block.content}
            </code>
          </pre>
        </div>
      );
  }
}

export function AIStreamingText({ text, isStreaming }: AIStreamingTextProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  if (!text && !isStreaming) return null;

  return (
    <div className="relative">
      <div className="max-w-none">
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} index={i} />
        ))}
      </div>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 rounded-full animate-cursor-blink" />
      )}
    </div>
  );
}
