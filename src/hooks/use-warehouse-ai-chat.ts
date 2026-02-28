/**
 * Hook for Warehouse AI Chat with Expert Selection
 *
 * Manages expert selection, warehouse context loading,
 * and streaming chat via OpenRouter Edge Function.
 */

import { useState, useRef, useCallback } from 'react';
import { streamCompletion } from '@/services/openrouter/client';
import {
  loadWarehouseContext,
  buildWarehouseChatMessages,
  type WarehouseExpertId,
  type WarehouseAIContext,
} from '@/services/openrouter/warehouse-prompts';
import type { ChatMessage } from '@/services/openrouter/types';

export interface UseWarehouseAIChatReturn {
  selectedExpert: WarehouseExpertId | null;
  selectExpert: (id: WarehouseExpertId) => void;
  clearExpert: () => void;

  isLoadingContext: boolean;
  contextError: string | null;

  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useWarehouseAIChat(locale: 'en' | 'de'): UseWarehouseAIChatReturn {
  const [selectedExpert, setSelectedExpert] = useState<WarehouseExpertId | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const contextRef = useRef<WarehouseAIContext | null>(null);

  const selectExpert = useCallback(async (id: WarehouseExpertId) => {
    setSelectedExpert(id);
    setMessages([]);
    setStreamingText('');
    setContextError(null);

    // Load context if not cached
    if (!contextRef.current) {
      setIsLoadingContext(true);
      try {
        contextRef.current = await loadWarehouseContext();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load warehouse data';
        setContextError(msg);
      } finally {
        setIsLoadingContext(false);
      }
    }
  }, []);

  const clearExpert = useCallback(() => {
    setSelectedExpert(null);
    setMessages([]);
    setStreamingText('');
    setContextError(null);
    // Keep context cache for next expert selection
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || isStreaming || !selectedExpert || !contextRef.current) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    setStreamingText('');

    const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
    const apiMessages = buildWarehouseChatMessages(
      selectedExpert,
      contextRef.current,
      chatHistory,
      userMessage,
      locale,
    );

    let fullText = '';
    try {
      for await (const chunk of streamCompletion(apiMessages, {
        maxTokens: 2000,
        temperature: 0.4,
        creditCost: 1,
        operationLabel: 'Warehouse AI Chat',
      })) {
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
  }, [isStreaming, selectedExpert, messages, locale]);

  return {
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
  };
}
