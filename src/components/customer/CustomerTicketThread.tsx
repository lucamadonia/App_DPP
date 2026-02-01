import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Paperclip, FileText, X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { uploadTicketAttachment, getTicketAttachmentUrl } from '@/services/supabase';
import type { RhTicketMessage } from '@/types/returns-hub';

interface CustomerTicketThreadProps {
  messages: RhTicketMessage[];
  onSend: (content: string, attachments: string[]) => void;
  sending?: boolean;
  ticketId: string;
}

function getDateLabel(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('Today');
  if (date.toDateString() === yesterday.toDateString()) return t('Yesterday');
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function CustomerTicketThread({ messages, onSend, sending, ticketId }: CustomerTicketThreadProps) {
  const { t } = useTranslation('customer-portal');
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!content.trim() && pendingFiles.length === 0) return;

    let attachmentPaths: string[] = [];
    if (pendingFiles.length > 0) {
      setUploading(true);
      const results = await Promise.all(
        pendingFiles.map((file) => uploadTicketAttachment(file, ticketId))
      );
      attachmentPaths = results.filter((r) => r.success && r.path).map((r) => r.path!);
      setUploading(false);
    }

    onSend(content.trim(), attachmentPaths);
    setContent('');
    setPendingFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = async (path: string) => {
    const url = await getTicketAttachmentUrl(path);
    if (url) window.open(url, '_blank');
  };

  let lastDateLabel = '';

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('No messages yet')}</p>
        )}
        {messages.map((msg) => {
          const isCustomer = msg.senderType === 'customer';
          const isSystem = msg.senderType === 'system';
          const dateLabel = getDateLabel(msg.createdAt, t);
          let showDateSeparator = false;
          if (dateLabel !== lastDateLabel) {
            lastDateLabel = dateLabel;
            showDateSeparator = true;
          }

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 border-t" />
                  <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                  <div className="flex-1 border-t" />
                </div>
              )}

              {isSystem ? (
                <div className="flex justify-center">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 ${
                    isCustomer
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${isCustomer ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {isCustomer ? t('You') : (msg.senderName || t('Support'))}
                      </span>
                    </div>
                    {msg.content && (
                      <p className={`text-sm whitespace-pre-wrap ${isCustomer ? 'text-primary-foreground' : ''}`}>
                        {msg.content}
                      </p>
                    )}
                    {msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((path, i) => (
                          <button
                            key={i}
                            onClick={() => handleDownload(path)}
                            className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 hover:opacity-80 ${
                              isCustomer ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-background/50 text-foreground'
                            }`}
                          >
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{getFileName(path)}</span>
                            <Download className="h-3 w-3 ml-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                    <span className={`text-[10px] mt-1 block ${isCustomer ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="border-t p-4 space-y-3">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pendingFiles.map((file, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removePendingFile(i)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('Type your message...')}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSend();
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button onClick={handleSend} disabled={(!content.trim() && pendingFiles.length === 0) || sending || uploading} size="icon">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
}
