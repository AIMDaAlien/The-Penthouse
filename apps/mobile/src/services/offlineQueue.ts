import type { PendingMessage } from '../types';

const KEY = 'penthouse.pendingMessages';

function readQueue(): PendingMessage[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as PendingMessage[];
    return Array.isArray(parsed) ? parsed : [];
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
    await sender(item);
    removeQueued(item.clientMessageId);
  }
}
