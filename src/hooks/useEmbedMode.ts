import { useLocation } from 'react-router-dom';

export function useEmbedMode() {
  const location = useLocation();
  const isEmbed = location.pathname.startsWith('/embed/');
  return { isEmbed };
}
