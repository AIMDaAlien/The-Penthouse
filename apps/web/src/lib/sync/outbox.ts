import type { SqlParam, SyncSqlDatabase } from './operations';

export type LocalTextMessageOutboxPayload = {
	chatId: string;
	content: string;
	clientMessageId: string;
	replyToMessageId?: string;
};

export type LocalOutboxItem = {
	id: number;
	operationType: 'message.send';
	payload: LocalTextMessageOutboxPayload;
	createdAt: string;
	retryCount: number;
	nextRetryAt: string | null;
	error: string | null;
};

const MAX_OUTBOX_ITEMS = 1000;

export function enqueueTextMessage(db: SyncSqlDatabase, payload: LocalTextMessageOutboxPayload) {
	db.run(
		`INSERT INTO outbox (operation_type, payload, created_at, retry_count)
		VALUES ('message.send', ?, datetime('now'), 0)`,
		[JSON.stringify(payload)]
	);
	trimOutbox(db);
}

export function removeOutboxItem(db: SyncSqlDatabase, id: number) {
	db.run('DELETE FROM outbox WHERE id = ?', [id]);
}

export function markOutboxAttempt(db: SyncSqlDatabase, id: number, error?: string) {
	const retryDelaySeconds = 30;
	db.run(
		`UPDATE outbox
		SET retry_count = retry_count + 1,
			next_retry_at = datetime('now', ?),
			error = ?
		WHERE id = ?`,
		[`+${retryDelaySeconds} seconds`, error ?? null, id]
	);
}

export function listDueOutboxItems(db: SyncSqlDatabase, limit = 25): LocalOutboxItem[] {
	return execRows<RawOutboxItem>(
		db,
		`SELECT id, operation_type, payload, created_at, retry_count, next_retry_at, error
		FROM outbox
		WHERE next_retry_at IS NULL OR next_retry_at <= datetime('now')
		ORDER BY created_at ASC
		LIMIT ?`,
		[limit]
	).map((row) => ({
		id: row.id,
		operationType: 'message.send',
		payload: JSON.parse(row.payload) as LocalTextMessageOutboxPayload,
		createdAt: row.created_at,
		retryCount: row.retry_count,
		nextRetryAt: row.next_retry_at,
		error: row.error
	}));
}

type RawOutboxItem = {
	id: number;
	operation_type: string;
	payload: string;
	created_at: string;
	retry_count: number;
	next_retry_at: string | null;
	error: string | null;
};

function trimOutbox(db: SyncSqlDatabase) {
	db.run(
		`DELETE FROM outbox
		WHERE id IN (
			SELECT id FROM outbox
			ORDER BY created_at ASC
			LIMIT max((SELECT count(*) FROM outbox) - ?, 0)
		)`,
		[MAX_OUTBOX_ITEMS]
	);
}

function execRows<T extends Record<string, unknown>>(
	db: SyncSqlDatabase,
	sql: string,
	params: SqlParam[]
): T[] {
	const maybeExec = db as SyncSqlDatabase & {
		exec?: (sql: string, params?: SqlParam[]) => Array<{ columns: string[]; values: unknown[][] }>;
	};
	const result = maybeExec.exec?.(sql, params) ?? [];
	const first = result[0];
	if (!first) return [];
	return first.values.map((values) => Object.fromEntries(
		first.columns.map((column, index) => [column, values[index]])
	) as T);
}
