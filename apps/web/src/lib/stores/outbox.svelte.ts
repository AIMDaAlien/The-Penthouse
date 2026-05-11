import { browser } from '$app/environment';

export type OutboxItem = {
	clientMessageId: string;
	chatId: string;
	content: string;
	messageType: string;
	metadata?: Record<string, unknown>;
	replyToMessageId?: string;
	timestamp: number;
	retries: number;
};

const STORAGE_KEY = 'penthouse:outbox';
const MAX_RETRIES = 5;

function load(): OutboxItem[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function save(items: OutboxItem[]) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function createOutboxStore() {
	let items = $state<OutboxItem[]>(load());

	return {
		get items() {
			return items;
		},
		add(item: Omit<OutboxItem, 'timestamp' | 'retries'>) {
			const next = [...items, { ...item, timestamp: Date.now(), retries: 0 }];
			items = next;
			save(next);
		},
		remove(clientMessageId: string) {
			const next = items.filter((i) => i.clientMessageId !== clientMessageId);
			items = next;
			save(next);
		},
		markRetry(clientMessageId: string) {
			const next = items.map((i) =>
				i.clientMessageId === clientMessageId ? { ...i, retries: i.retries + 1 } : i
			);
			items = next;
			save(next);
		},
		clear() {
			items = [];
			save([]);
		}
	};
}

export const outboxStore = createOutboxStore();
export { MAX_RETRIES };
