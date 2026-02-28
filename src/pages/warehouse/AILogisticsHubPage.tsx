import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  PackageOpen,
  Building2,
  TrendingUp,
  ArrowLeft,
  Trash2,
  ArrowUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIStreamingText } from '@/components/ai/AIStreamingText';
import { useWarehouseAIChat } from '@/hooks/use-warehouse-ai-chat';
import { useLocale } from '@/hooks/use-locale';
import { EXPERT_SUGGESTED_QUESTIONS, type WarehouseExpertId } from '@/services/openrouter/warehouse-prompts';

// ─── Typing Dots Animation ──────────────────────────────────

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

// ─── Expert Card ─────────────────────────────────────────────

interface ExpertCardProps {
  id: WarehouseExpertId;
  icon: React.ReactNode;
  name: string;
  description: string;
  onSelect: (id: WarehouseExpertId) => void;
}

function ExpertCard({ id, icon, name, description, onSelect }: ExpertCardProps) {
  const { t } = useTranslation('warehouse');
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:border-blue-700 dark:hover:shadow-blue-500/10">
      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative space-y-4">
        {/* Icon */}
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400">
          {icon}
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold">{name}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        {/* Button */}
        <Button
          onClick={() => onSelect(id)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          {t('Start Chat')}
          <ArrowUp className="ml-2 h-4 w-4 rotate-90" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export function AILogisticsHubPage() {
  const { t } = useTranslation('warehouse');
  const locale = useLocale();
  const {
    selectedExpert,
    selectExpert,
    clearExpert,
    isLoadingContext,
    contextError,
    messages,
    isStreaming,
    streamingText,
    sendMessage,
    clearChat,
  } = useWarehouseAIChat(locale);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // Focus input when expert selected and context loaded
  useEffect(() => {
    if (selectedExpert && !isLoadingContext && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedExpert, isLoadingContext]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const userMessage = (overrideText ?? input).trim();
    if (!userMessage || isStreaming) return;
    setInput('');
    await sendMessage(userMessage);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const expertConfig: Record<WarehouseExpertId, { icon: React.ReactNode; nameKey: string; descKey: string }> = {
    shipping: {
      icon: <PackageOpen className="h-6 w-6" />,
      nameKey: 'Shipping & Packaging Expert',
      descKey: 'Shipping Expert Description',
    },
    space: {
      icon: <Building2 className="h-6 w-6" />,
      nameKey: 'Warehouse Space Planner',
      descKey: 'Space Planner Description',
    },
    intelligence: {
      icon: <TrendingUp className="h-6 w-6" />,
      nameKey: 'Logistics Intelligence Analyst',
      descKey: 'Intelligence Analyst Description',
    },
  };

  const suggestedQuestions = selectedExpert ? EXPERT_SUGGESTED_QUESTIONS[selectedExpert] : [];

  // ─── Expert Selector View ─────────────────────────────────

  if (!selectedExpert) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('AI Logistics Hub')}</h1>
              <p className="text-sm text-muted-foreground">{t('Expert AI advisors for your warehouse operations')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
              <Sparkles className="h-3 w-3" />
              {t('1 AI credit per message')}
            </span>
          </div>
        </div>

        {/* Expert Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">{t('Select an AI Expert')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {(Object.keys(expertConfig) as WarehouseExpertId[]).map((id) => {
              const cfg = expertConfig[id];
              return (
                <ExpertCard
                  key={id}
                  id={id}
                  icon={cfg.icon}
                  name={t(cfg.nameKey)}
                  description={t(cfg.descKey)}
                  onSelect={selectExpert}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat View ─────────────────────────────────────────────

  const cfg = expertConfig[selectedExpert];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearExpert}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Back to Experts')}
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400">
              {cfg.icon}
            </div>
            <span className="font-medium text-sm">{t(cfg.nameKey)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Sparkles className="h-3 w-3" />
            {t('1 AI credit per message')}
          </span>
          {messages.length > 0 && (
            <Button
              onClick={clearChat}
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('Clear Chat')}
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingContext && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 animate-fade-in-up">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
            <p className="text-sm text-muted-foreground">{t('Loading warehouse data...')}</p>
          </div>
        </div>
      )}

      {/* Context Error */}
      {contextError && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 animate-fade-in-up">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-600">{t('Failed to load warehouse data')}</p>
            <p className="text-xs text-muted-foreground">{contextError}</p>
            <Button variant="outline" size="sm" onClick={clearExpert}>
              {t('Back to Experts')}
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {!isLoadingContext && !contextError && (
        <>
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
              {/* Empty State */}
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-12 space-y-4 animate-fade-in-up">
                  <div className="flex items-center justify-center h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    {cfg.icon}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('Ask me about logistics.')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(t(q))}
                        className="text-xs border rounded-full px-3 py-1.5 text-muted-foreground hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200 cursor-pointer"
                      >
                        {t(q)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Bubbles */}
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

              {/* Streaming Response */}
              {isStreaming && streamingText && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm bg-muted/70 border border-border/50">
                    <AIStreamingText text={streamingText} isStreaming={true} />
                  </div>
                </div>
              )}

              {/* Typing Indicator */}
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
          <div className="border-t bg-background/80 backdrop-blur-sm p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-300 transition-all duration-200">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('Enter your question...')}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
