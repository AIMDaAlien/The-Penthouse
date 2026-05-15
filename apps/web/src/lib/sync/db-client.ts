import { browser } from '$app/environment';
import type { SyncEvent } from '@penthouse/contracts';
import type { SqlParam } from './operations';

type WorkerRequest =
	| { id: number; method: 'init'; params: { userId: string } }
	| { id: number; method: 'reset'; params: { userId?: string } }
	| { id: number; method: 'applyEvents'; params: { events: SyncEvent[] } }
	| { id: number; method: 'query'; params: { sql: string; params?: SqlParam[] } }
	| { id: number; method: 'run'; params: { sql: string; params?: SqlParam[] } }
	| { id: number; method: 'getMeta'; params: { key: string } }
	| { id: number; method: 'setMeta'; params: { key: string; value: string } };

type WorkerResponse =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: string };

export class LocalSyncDbClient {
	private worker: Worker | null = null;
	private nextId = 1;
	private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

	async init(userId: string) {
		await this.call('init', { userId });
	}

	async reset(userId?: string) {
		await this.call('reset', { userId });
	}

	async applyEvents(events: SyncEvent[]) {
		await this.call('applyEvents', { events });
	}

	async query<T extends Record<string, unknown>>(sql: string, params?: SqlParam[]) {
		return this.call('query', { sql, params }) as Promise<T[]>;
	}

	async run(sql: string, params?: SqlParam[]) {
		await this.call('run', { sql, params });
	}

	async getMeta(key: string) {
		return this.call('getMeta', { key }) as Promise<string | null>;
	}

	async setMeta(key: string, value: string) {
		await this.call('setMeta', { key, value });
	}

	private ensureWorker() {
		if (!browser) throw new Error('Local sync DB is only available in the browser');
		if (this.worker) return this.worker;

		this.worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
		this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const pending = this.pending.get(event.data.id);
			if (!pending) return;
			this.pending.delete(event.data.id);
			if (event.data.ok) {
				pending.resolve(event.data.result);
			} else {
				pending.reject(new Error(event.data.error));
			}
		};
		return this.worker;
	}

	private call<TMethod extends WorkerRequest['method']>(
		method: TMethod,
		params: Extract<WorkerRequest, { method: TMethod }>['params']
	) {
		const worker = this.ensureWorker();
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			worker.postMessage({ id, method, params } as WorkerRequest);
		});
	}
}

export const localSyncDb = new LocalSyncDbClient();
