/**
 * Simple toast hook for notifications
 * Can be replaced with a more sophisticated toast library later
 */

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: Toast) => {
    const message = [title, description].filter(Boolean).join(': ');

    if (variant === 'destructive') {
      console.error(message);
      alert(`Error: ${message}`);
    } else {
      console.log(message);
      // In a real implementation, you'd show a nice toast notification
      // For now, we just log it
    }
  };

  return { toast };
}
