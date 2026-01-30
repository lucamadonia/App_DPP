import { useState, useCallback, useRef } from 'react';
import { streamCompletion } from '@/services/openrouter/client';
import type { OpenRouterMessage } from '@/services/openrouter/types';

interface UseAIStreamReturn {
  text: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (messages: OpenRouterMessage[], options?: { maxTokens?: number; temperature?: number }) => Promise<string>;
  reset: () => void;
}

export function useAIStream(): UseAIStreamReturn {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setText('');
    setError(null);
    setIsStreaming(false);
    abortRef.current = true;
  }, []);

  const startStream = useCallback(async (
    messages: OpenRouterMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> => {
    setText('');
    setError(null);
    setIsStreaming(true);
    abortRef.current = false;

    let fullText = '';

    try {
      for await (const chunk of streamCompletion(messages, options)) {
        if (abortRef.current) break;
        fullText += chunk;
        setText(fullText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setIsStreaming(false);
    }

    return fullText;
  }, []);

  return { text, isStreaming, error, startStream, reset };
}
