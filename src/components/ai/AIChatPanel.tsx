import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { streamCompletion } from '@/services/openrouter/client';
import { buildChatMessages } from '@/services/openrouter/prompts';
import { AIStreamingText } from './AIStreamingText';
import type { ProductContext, RequirementSummary, ChatMessage } from '@/services/openrouter/types';

interface AIChatPanelProps {
  productContext: ProductContext;
  requirements: RequirementSummary[];
}

export function AIChatPanel({ productContext, requirements }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleSend = useCallback(async () => {
    const userMessage = input.trim();
    if (!userMessage || isStreaming) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    setStreamingText('');

    const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
    const apiMessages = buildChatMessages(productContext, requirements, chatHistory, userMessage);

    let fullText = '';
    try {
      for await (const chunk of streamCompletion(apiMessages, { maxTokens: 1000, temperature: 0.5 })) {
        fullText += chunk;
        setStreamingText(fullText);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Fehler bei der KI-Anfrage';
      setMessages(prev => [...prev, { role: 'assistant', content: `Fehler: ${errorMsg}` }]);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [input, isStreaming, messages, productContext, requirements]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingText('');
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg gap-0"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Sheet Panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Compliance-Assistent
            </SheetTitle>
            <SheetDescription>
              Stellen Sie Fragen zu den Anforderungen Ihres Produkts.
            </SheetDescription>
          </SheetHeader>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-4 min-h-0">
            {messages.length === 0 && !isStreaming && (
              <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-primary/40" />
                <p>Fragen Sie mich zu Compliance-Anforderungen.</p>
                <div className="space-y-1 text-xs">
                  <p className="italic">"Welche Normen gelten für mein Produkt?"</p>
                  <p className="italic">"Was kostet die CE-Zertifizierung?"</p>
                  <p className="italic">"Brauche ich eine benannte Stelle?"</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <AIStreamingText text={msg.content} isStreaming={false} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted">
                  <AIStreamingText text={streamingText} isStreaming={true} />
                </div>
              </div>
            )}

            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Denke nach...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t space-y-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Frage eingeben..."
                disabled={isStreaming}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {messages.length > 0 && (
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Chat leeren
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
