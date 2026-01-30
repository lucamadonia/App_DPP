import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Sparkles, Trash2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { streamCompletion } from '@/services/openrouter/client';
import { buildChatMessages } from '@/services/openrouter/prompts';
import { AIStreamingText } from './AIStreamingText';
import type { ProductContext, RequirementSummary, ChatMessage } from '@/services/openrouter/types';

interface AIChatPanelProps {
  productContext: ProductContext;
  requirements: RequirementSummary[];
}

const SUGGESTED_QUESTIONS = [
  'Which standards apply to my product?',
  'What does CE certification cost?',
  'Do I need a notified body?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-blue-400"
          style={{
            animation: 'bounce-dots 1.4s infinite ease-in-out both',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

export function AIChatPanel({ productContext, requirements }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const userMessage = (overrideText ?? input).trim();
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
      const errorMsg = err instanceof Error ? err.message : 'Error during AI request';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
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

  const handleSuggestionClick = (question: string) => {
    handleSend(question);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center animate-glow-pulse"
      >
        <MessageCircle className="h-6 w-6" />
        {/* Ping indicator */}
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-400" />
        </span>
      </button>

      {/* Sheet Panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border-b">
            <SheetHeader className="p-4 sm:p-6">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Compliance Assistant
              </SheetTitle>
              <SheetDescription>
                Ask questions about your product's requirements.
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-8 space-y-4 animate-fade-in-up">
                  <div className="flex items-center justify-center h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    <Sparkles className="h-7 w-7 text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask me about compliance requirements.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(q)}
                        className="text-xs border rounded-full px-3 py-1.5 text-muted-foreground hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200 cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                        : 'rounded-2xl rounded-bl-md bg-muted/70 border border-border/50'
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
                <div className="flex justify-start animate-fade-in-up">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm bg-muted/70 border border-border/50">
                    <AIStreamingText text={streamingText} isStreaming={true} />
                  </div>
                </div>
              )}

              {isStreaming && !streamingText && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/70 border border-border/50">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/80 backdrop-blur-sm space-y-2">
            <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-300 transition-all duration-200">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter question..."
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 py-1.5"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md transition-all duration-200 shrink-0"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            {messages.length > 0 && (
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground gap-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Chat
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
