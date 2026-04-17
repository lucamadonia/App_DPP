import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Zap,
  Radio,
  Cpu,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIStreamingText } from '@/components/ai/AIStreamingText';
import { useWarehouseAIChat } from '@/hooks/use-warehouse-ai-chat';
import { useLocale } from '@/hooks/use-locale';
import { EXPERT_SUGGESTED_QUESTIONS, type WarehouseExpertId } from '@/services/openrouter/warehouse-prompts';

// ─── Animated Background ─────────────────────────────────────

function HubBackdrop({ variant = 'hero' }: { variant?: 'hero' | 'chat' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Grid */}
      <div className="absolute inset-0 hub-grid-bg opacity-60 animate-grid-drift" />
      {/* Radial fade to hide grid edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_85%)]" />
      {/* Floating orbs */}
      <div className="absolute -top-24 -left-16 h-[380px] w-[380px] rounded-full bg-blue-500/20 blur-3xl animate-orb-float" />
      <div className="absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full bg-violet-500/15 blur-3xl animate-orb-float-alt" />
      {variant === 'hero' && (
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full bg-cyan-400/15 blur-3xl animate-orb-float" style={{ animationDelay: '-7s' }} />
      )}
    </div>
  );
}

// ─── Live Status Dot ─────────────────────────────────────────

function LiveDot({ color = 'emerald' }: { color?: 'emerald' | 'blue' | 'amber' }) {
  const colors = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full ${colors[color]} animate-status-ping`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colors[color]}`} />
    </span>
  );
}

// ─── Waveform Typing Indicator ───────────────────────────────

function WaveformTyping() {
  return (
    <div className="flex items-end gap-[3px] h-5 px-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-violet-500 animate-waveform-pulse origin-bottom"
          style={{ animationDelay: `${i * 0.12}s`, height: '100%' }}
        />
      ))}
    </div>
  );
}

// ─── Expert Avatar ───────────────────────────────────────────

function ExpertAvatar({
  icon,
  size = 'md',
  active = false,
}: {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  return (
    <div className="relative shrink-0">
      {active && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 blur-md opacity-60 animate-pulse" />
      )}
      <div
        className={`relative ${sizes[size]} rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border border-white/10 flex items-center justify-center text-cyan-300 shadow-lg shadow-blue-500/20`}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-violet-500/20" />
        <div className="relative">{icon}</div>
      </div>
    </div>
  );
}

// ─── Expert Card ─────────────────────────────────────────────

interface ExpertCardProps {
  id: WarehouseExpertId;
  icon: React.ReactNode;
  name: string;
  description: string;
  specialty: string;
  index: number;
  onSelect: (id: WarehouseExpertId) => void;
}

function ExpertCard({ id, icon, name, description, specialty, index, onSelect }: ExpertCardProps) {
  const { t } = useTranslation('warehouse');
  return (
    <button
      onClick={() => onSelect(id)}
      className="group relative text-left w-full rounded-3xl p-[1px] bg-gradient-to-br from-white/40 via-white/20 to-white/5 dark:from-white/10 dark:via-white/5 dark:to-transparent cursor-pointer transition-transform duration-300 hover:-translate-y-1 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Outer holographic border on hover */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 rounded-3xl bg-[conic-gradient(from_0deg,transparent_0%,#3b82f6_20%,#8b5cf6_40%,#06b6d4_60%,transparent_80%)] animate-holo-spin blur-sm" />
      </div>

      {/* Card body */}
      <div className="relative rounded-3xl bg-card/95 backdrop-blur-xl p-5 sm:p-6 h-full overflow-hidden">
        {/* Inner gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-violet-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Scan line on hover */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-70 group-hover:animate-scan-sweep" />

        {/* Meta chip */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            <Radio className="h-3 w-3 text-emerald-500" />
            <LiveDot />
            <span>Online</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/70">
            AGENT-{String(index + 1).padStart(2, '0')}
          </div>
        </div>

        {/* Avatar */}
        <div className="relative mb-4">
          <ExpertAvatar icon={icon} size="xl" />
        </div>

        {/* Name */}
        <h3 className="relative text-lg sm:text-xl font-bold tracking-tight mb-1.5">
          {name}
        </h3>

        {/* Specialty tag */}
        <div className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 mb-3">
          <Cpu className="h-2.5 w-2.5" />
          {specialty}
        </div>

        {/* Description */}
        <p className="relative text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-3">
          {description}
        </p>

        {/* CTA row */}
        <div className="relative flex items-center justify-between pt-4 border-t border-border/50">
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {t('Start Chat')}
          </span>
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/30 group-hover:shadow-lg group-hover:shadow-violet-500/40 group-hover:scale-110 transition-all duration-300">
            <ArrowUp className="h-4 w-4 rotate-45" />
          </div>
        </div>
      </div>
    </button>
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

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

  const expertConfig: Record<WarehouseExpertId, { icon: React.ReactNode; nameKey: string; descKey: string; specialtyKey: string }> = useMemo(() => ({
    shipping: {
      icon: <PackageOpen className="h-6 w-6" />,
      nameKey: 'Shipping & Packaging Expert',
      descKey: 'Shipping Expert Description',
      specialtyKey: 'Fulfillment',
    },
    space: {
      icon: <Building2 className="h-6 w-6" />,
      nameKey: 'Warehouse Space Planner',
      descKey: 'Space Planner Description',
      specialtyKey: 'Space Ops',
    },
    intelligence: {
      icon: <TrendingUp className="h-6 w-6" />,
      nameKey: 'Logistics Intelligence Analyst',
      descKey: 'Intelligence Analyst Description',
      specialtyKey: 'Analytics',
    },
  }), []);

  const suggestedQuestions = selectedExpert ? EXPERT_SUGGESTED_QUESTIONS[selectedExpert] : [];

  // ─── Expert Selector View ─────────────────────────────────

  if (!selectedExpert) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <HubBackdrop variant="hero" />

        <div className="relative container mx-auto max-w-6xl px-4 py-8 sm:py-12 lg:py-16 space-y-10 sm:space-y-12">
          {/* Epic Hero */}
          <div className="space-y-6 animate-fade-in-up">
            {/* Status bar */}
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/60 text-xs font-mono">
              <LiveDot />
              <span className="text-muted-foreground uppercase tracking-[0.2em]">
                {t('3 AI Agents Online', { defaultValue: '3 AI Agents Online' })}
              </span>
              <div className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-3 w-3" />
                {t('1 AI credit per message')}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 shadow-xl shadow-blue-500/30">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 blur-lg opacity-50 animate-pulse" />
                  <Cpu className="relative h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2} />
                </div>
                <div className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  {t('Logistics Command Center', { defaultValue: 'Logistics Command Center' })}
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95]">
                <span className="animate-text-shimmer-fast">
                  {t('AI Logistics Hub')}
                </span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                {t('Expert AI advisors for your warehouse operations')}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
              {[
                { icon: Zap, label: t('Instant Analysis', { defaultValue: 'Instant Analysis' }), color: 'text-amber-500' },
                { icon: Command, label: t('Context-Aware', { defaultValue: 'Context-Aware' }), color: 'text-blue-500' },
                { icon: Radio, label: t('Real-Time Data', { defaultValue: 'Real-Time Data' }), color: 'text-emerald-500' },
              ].map(({ icon: Icon, label, color }, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/60 text-xs font-medium animate-fade-in-up"
                  style={{ animationDelay: `${100 + i * 80}ms`, animationFillMode: 'both' }}
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Experts Grid */}
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  {'// '}
                  {t('Select an AI Expert')}
                </h2>
                <p className="text-lg sm:text-xl font-semibold mt-1">
                  {t('Choose your specialist', { defaultValue: 'Choose your specialist' })}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>3</span>
                <div className="h-3 w-px bg-border" />
                <span>AGENTS</span>
              </div>
            </div>

            <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(expertConfig) as WarehouseExpertId[]).map((id, idx) => {
                const cfg = expertConfig[id];
                return (
                  <ExpertCard
                    key={id}
                    id={id}
                    icon={cfg.icon}
                    name={t(cfg.nameKey)}
                    description={t(cfg.descKey)}
                    specialty={t(cfg.specialtyKey)}
                    index={idx}
                    onSelect={selectExpert}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat View ─────────────────────────────────────────────

  const cfg = expertConfig[selectedExpert];

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <HubBackdrop variant="chat" />

      {/* Chat Header - Command Bar */}
      <div className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearExpert}
              className="gap-1 text-xs px-2 h-8 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Back to Experts')}</span>
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              <ExpertAvatar icon={cfg.icon} size="sm" active={isStreaming} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{t(cfg.nameKey)}</span>
                  <LiveDot color={isStreaming ? 'amber' : 'emerald'} />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>{isStreaming ? t('Processing', { defaultValue: 'Processing' }) : t('Online', { defaultValue: 'Online' })}</span>
                  <span>•</span>
                  <span>{messages.filter((m) => m.role === 'user').length} {t('queries', { defaultValue: 'queries' })}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
              <Sparkles className="h-3 w-3" />
              1 CREDIT/MSG
            </span>
            {messages.length > 0 && (
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-8 px-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('Clear Chat')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingContext && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 animate-fade-in-up">
            <div className="relative h-14 w-14 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 blur-xl opacity-50 animate-pulse" />
              <div className="relative h-14 w-14 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t('Loading warehouse data...')}</p>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {t('Syncing context', { defaultValue: 'Syncing context' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Context Error */}
      {contextError && (
        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3 animate-fade-in-up max-w-md">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-red-600">{t('Failed to load warehouse data')}</p>
            <p className="text-xs text-muted-foreground font-mono">{contextError}</p>
            <Button variant="outline" size="sm" onClick={clearExpert}>
              {t('Back to Experts')}
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {!isLoadingContext && !contextError && (
        <>
          <ScrollArea className="relative z-10 flex-1 min-h-0" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
              {/* Empty State */}
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-10 sm:py-16 space-y-6 animate-fade-in-up">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 blur-2xl opacity-40 animate-pulse" />
                    <ExpertAvatar icon={cfg.icon} size="xl" active />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base sm:text-lg font-semibold">
                      {t(cfg.nameKey)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('Ask me about logistics.')}
                    </p>
                  </div>

                  {/* Suggested prompts */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto pt-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={q}
                        onClick={() => handleSend(t(q))}
                        className="group relative text-xs px-3 py-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-200 cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: `${150 + i * 80}ms`, animationFillMode: 'both' }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                          {t(q)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Bubbles */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <ExpertAvatar icon={cfg.icon} size="sm" />
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] relative ${
                      msg.role === 'user'
                        ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 px-4 py-2.5 text-sm'
                        : 'rounded-2xl rounded-bl-sm bg-card/80 backdrop-blur-sm border border-border/60 px-4 py-3 text-sm shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <>
                        <div className="absolute inset-0 rounded-2xl rounded-br-sm bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
                        <span className="relative">{msg.content}</span>
                      </>
                    ) : (
                      <AIStreamingText text={msg.content} isStreaming={false} />
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Response */}
              {isStreaming && streamingText && (
                <div className="flex gap-2.5 justify-start animate-fade-in-up">
                  <ExpertAvatar icon={cfg.icon} size="sm" active />
                  <div className="relative max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-card/80 backdrop-blur-sm border border-blue-500/30 shadow-sm overflow-hidden">
                    {/* Animated scan line during streaming */}
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-sweep" />
                    <AIStreamingText text={streamingText} isStreaming={true} />
                  </div>
                </div>
              )}

              {/* Typing Indicator */}
              {isStreaming && !streamingText && (
                <div className="flex gap-2.5 justify-start animate-fade-in-up">
                  <ExpertAvatar icon={cfg.icon} size="sm" active />
                  <div className="relative rounded-2xl rounded-bl-sm px-4 py-3 bg-card/80 backdrop-blur-sm border border-blue-500/30 shadow-sm overflow-hidden">
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-sweep" />
                    <div className="flex items-center gap-2">
                      <WaveformTyping />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {t('Thinking', { defaultValue: 'Thinking' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Command Input */}
          <div className="relative z-10 border-t border-border/60 bg-background/70 backdrop-blur-xl p-3 sm:p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                {/* Glowing animated ring when focused */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-violet-500/0 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />

                <div className="relative flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md px-2 sm:px-3 py-1.5 focus-within:border-blue-500/60 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all duration-200">
                  {/* Command prefix */}
                  <div className="hidden sm:flex items-center gap-1 pl-1 pr-2 border-r border-border/60">
                    <Command className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      ASK
                    </span>
                  </div>

                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('Enter your question...')}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-50 py-1.5 px-1"
                  />

                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isStreaming}
                    className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 text-white disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:shadow-lg enabled:hover:shadow-blue-500/40 enabled:hover:scale-105 transition-all duration-200 shrink-0 cursor-pointer group/btn"
                    aria-label={t('Send', { defaultValue: 'Send' })}
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    {isStreaming ? (
                      <Loader2 className="relative h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="relative h-4 w-4 group-enabled/btn:group-hover/btn:-translate-y-0.5 transition-transform" />
                    )}
                  </button>
                </div>
              </div>

              {/* Hint row */}
              <div className="mt-2 px-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-sans">Enter</kbd>
                  <span>{t('to send', { defaultValue: 'to send' })}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <LiveDot color={isStreaming ? 'amber' : 'emerald'} />
                  <span>{isStreaming ? t('AI Processing', { defaultValue: 'AI Processing' }) : t('Ready', { defaultValue: 'Ready' })}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
