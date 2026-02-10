/**
 * Toast hook powered by Sonner
 */
import { toast as sonnerToast } from 'sonner';

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export function useToast() {
  const toast = ({ title, description, variant }: Toast) => {
    const message = title || '';
    const opts = { description };

    switch (variant) {
      case 'destructive':
        sonnerToast.error(message, opts);
        break;
      case 'success':
        sonnerToast.success(message, opts);
        break;
      case 'warning':
        sonnerToast.warning(message, opts);
        break;
      default:
        sonnerToast(message, opts);
    }
  };

  return { toast };
}
