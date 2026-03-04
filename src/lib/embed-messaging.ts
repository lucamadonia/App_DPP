/**
 * PostMessage communication for embed mode.
 * Sends events to the parent window when running inside an iframe.
 */

type EmbedEventType = 'trackbliss:ready' | 'trackbliss:resize' | 'trackbliss:return_created' | 'trackbliss:ticket_created';

interface EmbedEventPayload {
  type: EmbedEventType;
  height?: number;
  returnNumber?: string;
  ticketNumber?: string;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function postToParent(payload: EmbedEventPayload) {
  if (!isInIframe()) return;
  try {
    window.parent.postMessage(payload, '*');
  } catch {
    // silently fail if postMessage blocked
  }
}

/**
 * Send a ready event with the current document height.
 */
export function sendReadyEvent() {
  postToParent({
    type: 'trackbliss:ready',
    height: document.documentElement.scrollHeight,
  });
}

/**
 * Send a resize event with the current document height.
 */
export function sendResizeEvent() {
  postToParent({
    type: 'trackbliss:resize',
    height: document.documentElement.scrollHeight,
  });
}

/**
 * Send a return_created event with the return number.
 */
export function sendReturnCreatedEvent(returnNumber: string) {
  postToParent({
    type: 'trackbliss:return_created',
    returnNumber,
  });
}

/**
 * Send a ticket_created event with the ticket number.
 */
export function sendTicketCreatedEvent(ticketNumber: string) {
  postToParent({
    type: 'trackbliss:ticket_created',
    ticketNumber,
  });
}

/**
 * Initialize a ResizeObserver that posts height changes to parent.
 * Returns a cleanup function.
 */
export function initEmbedResizeObserver(): () => void {
  let lastHeight = 0;

  const observer = new ResizeObserver(() => {
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      sendResizeEvent();
    }
  });

  observer.observe(document.body);

  return () => observer.disconnect();
}
