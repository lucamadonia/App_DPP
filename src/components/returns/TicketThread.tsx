import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Paperclip, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { RhTicketMessage } from '@/types/returns-hub';

interface TicketThreadProps {
  messages: RhTicketMessage[];
  onSend: (content: string, isInternal: boolean) => void;
  sending?: boolean;
}

export function TicketThread({ messages, onSend, sending }: TicketThreadProps) {
  const { t } = useTranslation('returns');
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content.trim(), isInternal);
    setContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('No data available')}</p>
        )}
        {messages.map((msg) => {
          const isAgent = msg.senderType === 'agent';
          const isSystem = msg.senderType === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg p-3 ${
                msg.isInternal
                  ? 'bg-amber-50 border border-amber-200'
                  : isAgent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${isAgent && !msg.isInternal ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {msg.senderName || (isAgent ? t('Agent') : t('Customer'))}
                  </span>
                  {msg.isInternal && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-100 text-amber-700 border-amber-300">
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      {t('Internal Note')}
                    </Badge>
                  )}
                </div>
                <p className={`text-sm whitespace-pre-wrap ${isAgent && !msg.isInternal ? 'text-primary-foreground' : ''}`}>
                  {msg.content}
                </p>
                <span className={`text-[10px] mt-1 block ${isAgent && !msg.isInternal ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="internal-note"
            checked={isInternal}
            onCheckedChange={setIsInternal}
          />
          <Label htmlFor="internal-note" className="text-sm">
            {t('Internal Note')}
          </Label>
        </div>
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
            <Button onClick={handleSend} disabled={!content.trim() || sending} size="icon">
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled>
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
