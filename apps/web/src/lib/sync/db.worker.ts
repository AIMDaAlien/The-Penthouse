/// <reference lib="webworker" />

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import schemaSql from './schema.sql?raw';
import { applySyncEvents, type SqlParam } from './operations';
import type { SyncEvent } from '@penthouse/contracts';

type WorkerRequest =
	| { id: number; method: 'init'; params: { userId: string } }
	| { id: number; method: 'reset'; params: { userId?: string } }
	| { id: number; method: 'applyEvents'; params: { events: SyncEvent[] } }
	| { id: number; method: 'query'; params: { sql: string; params?: SqlParam[] } }
	| { id: number; method: 'run'; params: { sql: string; params?: SqlParam[] } }
	| { id: number; method: 'getMeta'; params: { key: string } }
	| { id: number; method: 'setMeta'; params: { key: string; value: string } };

const ctx = self as DedicatedWorkerGlobalScope;
const IDB_NAME = 'penthouse-local-sync';
const IDB_STORE = 'databases';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let activeUserId: string | null = null;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { id, method, params } = event.data;
	try {
		const result = await handle(method, params as never);
		ctx.postMessage({ id, ok: true, result });
	} catch (error) {
		ctx.postMessage({
			id,
			ok: false,
			error: error instanceof Error ? error.message : 'Local sync worker error'
		});
	}
};

async function handle(method: WorkerRequest['method'], params: never) {
	switch (method) {
		case 'init': {
			const { userId } = params as { userId: string };
			activeUserId = userId;
			await initDb(userId);
			return true;
		}

		case 'reset': {
			const { userId } = params as { userId?: string };
			const key = userId ?? activeUserId;
			if (key && key === activeUserId) {
				db?.close();
				db = null;
				activeUserId = null;
			}
			if (key) await idbDelete(key);
			return true;
		}

		case 'applyEvents': {
			const { events } = params as { events: SyncEvent[] };
			const database = requireDb();
			applySyncEvents(database, events);
			await persist();
			return true;
		}

		case 'query': {
			const { sql, params: sqlParams } = params as { sql: string; params?: SqlParam[] };
			return queryRows(requireDb(), sql, sqlParams);
		}

		case 'run': {
			const { sql, params: sqlParams } = params as { sql: string; params?: SqlParam[] };
			requireDb().run(sql, sqlParams);
			await persist();
			return true;
		}

		case 'getMeta': {
			const { key } = params as { key: string };
			const rows = queryRows<{ value: string }>(requireDb(), 'SELECT value FROM _meta WHERE key = ?', [key]);
			return rows[0]?.value ?? null;
		}

		case 'setMeta': {
			const { key, value } = params as { key: string; value: string };
			requireDb().run(
				`INSERT INTO _meta (key, value) VALUES (?, ?)
				ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
				[key, value]
			);
			await persist();
			return true;
		}
	}
}

async function initDb(userId: string) {
	if (!SQL) {
		SQL = await initSqlJs({ locateFile: () => wasmUrl });
	}

	const bytes = await idbGet(userId);
	db = bytes ? new SQL.Database(bytes) : new SQL.Database();
	db.run(schemaSql);
	await persist();
}

function requireDb() {
	if (!db) throw new Error('Local sync DB is not initialized');
	return db;
}

async function persist() {
	if (!db || !activeUserId) return;
	await idbSet(activeUserId, db.export());
}

function queryRows<T extends Record<string, unknown>>(database: Database, sql: string, params?: SqlParam[]) {
	const result = database.exec(sql, params);
	const first = result[0];
	if (!first) return [] as T[];
	return first.values.map((values) => Object.fromEntries(
		first.columns.map((column, index) => [column, values[index]])
	) as T);
}

async function openStore(mode: IDBTransactionMode) {
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(IDB_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(IDB_STORE);
		};
		request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
		request.onsuccess = () => resolve(request.result);
	});

	const tx = database.transaction(IDB_STORE, mode);
	return {
		store: tx.objectStore(IDB_STORE),
		done: new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => {
				database.close();
				resolve();
			};
			tx.onerror = () => {
				database.close();
				reject(tx.error ?? new Error('IndexedDB transaction failed'));
			};
		})
	};
}

async function idbGet(key: string) {
	const { store, done } = await openStore('readonly');
	const value = await new Promise<Uint8Array | null>((resolve, reject) => {
		const request = store.get(key);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
		request.onsuccess = () => resolve(request.result ?? null);
	});
	await done;
	return value;
}

async function idbSet(key: string, value: Uint8Array) {
	const { store, done } = await openStore('readwrite');
	store.put(value, key);
	await done;
}

async function idbDelete(key: string) {
	const { store, done } = await openStore('readwrite');
	store.delete(key);
	await done;
}
