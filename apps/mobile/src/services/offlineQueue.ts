import type { PendingMessage } from '../types';

const KEY = 'penthouse.pendingMessages';

function readQueue(): PendingMessage[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<PendingMessage>>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Partial<PendingMessage> & { chatId: string; content: string; clientMessageId: string; enqueuedAt: string } =>
        Boolean(
          item &&
          typeof item.chatId === 'string' &&
          typeof item.content === 'string' &&
          typeof item.clientMessageId === 'string' &&
          typeof item.enqueuedAt === 'string'
        )
      )
      .map((item) => ({
        chatId: item.chatId,
        content: item.content,
        type: item.type ?? 'text',
        metadata: item.metadata ?? null,
        clientMessageId: item.clientMessageId,
        enqueuedAt: item.enqueuedAt,
        attempts: typeof item.attempts === 'number' ? item.attempts : 0
      }));
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingMessage[]): void {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function enqueueMessage(item: PendingMessage): void {
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
}

export function removeQueued(clientMessageId: string): void {
  writeQueue(readQueue().filter((item) => item.clientMessageId !== clientMessageId));
}

export function getQueued(): PendingMessage[] {
  return readQueue();
}

export async function flushQueue(
  sender: (item: PendingMessage) => Promise<void>,
  onAttempt?: (item: PendingMessage) => void
): Promise<void> {
  const queue = readQueue();
  for (const item of queue) {
    onAttempt?.(item);
    try {
      await sender(item);
      removeQueued(item.clientMessageId);
    } catch {
      // Leave in queue for next flush attempt; continue with remaining items
    }
  }
}
