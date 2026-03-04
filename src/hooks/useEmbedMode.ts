import { useMemo } from 'react';

export function useEmbedMode() {
  const isEmbed = useMemo(() => window.location.pathname.startsWith('/embed/'), []);
  return { isEmbed };
}
