import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClientSyncRequestSchema,
  ServerSyncBatchEventSchema,
  SyncOperationSchema
} from '../src/sync.js';

const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MESSAGE_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('ClientSyncRequestSchema', () => {
  it('accepts numeric cursors and bounded limits', () => {
    const result = ClientSyncRequestSchema.safeParse({
      type: 'sync.request',
      cursor: '42',
      limit: 100
    });

    assert.equal(result.success, true);
  });

  it('rejects opaque non-numeric cursors', () => {
    const result = ClientSyncRequestSchema.safeParse({
      type: 'sync.request',
      cursor: 'not-a-cursor'
    });

    assert.equal(result.success, false);
  });
});

describe('SyncOperationSchema', () => {
  it('accepts upserts and tombstone operations', () => {
    assert.equal(SyncOperationSchema.safeParse({
      type: 'message.upsert',
      payload: {
        id: MESSAGE_ID,
        chatId: CHAT_ID,
        senderId: USER_ID,
        content: 'Shadow synced.',
        type: 'text',
        createdAt: new Date().toISOString()
      }
    }).success, true);

    assert.equal(SyncOperationSchema.safeParse({
      type: 'folder_item.delete',
      payload: {
        folderId: '550e8400-e29b-41d4-a716-446655440003',
        chatId: CHAT_ID
      }
    }).success, true);
  });
});

describe('ServerSyncBatchEventSchema', () => {
  it('accepts a sync batch event payload', () => {
    const result = ServerSyncBatchEventSchema.safeParse({
      type: 'sync.batch',
      payload: {
        cursor: '0',
        nextCursor: '7',
        hasMore: false,
        ops: [{
          id: '7',
          createdAt: new Date().toISOString(),
          op: {
            type: 'read.upsert',
            payload: {
              chatId: CHAT_ID,
              userId: USER_ID,
              lastReadAt: new Date().toISOString(),
              lastReadMessageId: MESSAGE_ID,
              notificationsMuted: false,
              archivedAt: null
            }
          }
        }]
      }
    });

    assert.equal(result.success, true);
  });
});
