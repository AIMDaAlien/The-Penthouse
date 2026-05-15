import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  AddFolderItemRequestSchema,
  CreateFolderRequestSchema,
  ReorderFoldersRequestSchema,
  UpdateFolderRequestSchema
} from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chatFolders, chatFolderItems } from '../../db/schema.js';
import { chatMembers } from '../../db/schema.js';
import { notFound, forbidden } from '../../utils/error-responses.js';
import { appendSyncEvent } from '../sync/service.js';

async function assertFolderOwner(folderId: string, userId: string) {
  const [folder] = await db.select().from(chatFolders)
    .where(and(eq(chatFolders.id, folderId), eq(chatFolders.userId, userId)))
    .limit(1);
  if (!folder) throw notFound('Folder not found');
  return folder;
}

function serializeFolder(folder: typeof chatFolders.$inferSelect) {
  return {
    id: folder.id,
    userId: folder.userId,
    name: folder.name,
    icon: folder.icon,
    color: folder.color,
    sortOrder: folder.sortOrder,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString()
  };
}

function serializeItem(item: typeof chatFolderItems.$inferSelect) {
  return {
    folderId: item.folderId,
    chatId: item.chatId,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString()
  };
}

export async function registerChatFolderRoutes(fastify: FastifyInstance) {
  // ─── List folders with items ───

  fastify.get('/api/v1/folders', { preHandler: fastify.authenticate }, async (request) => {
    const userId = request.authUser!.userId;

    const folders = await db.select().from(chatFolders)
      .where(eq(chatFolders.userId, userId))
      .orderBy(chatFolders.sortOrder, chatFolders.createdAt);

    const folderIds = folders.map((f) => f.id);
    let items: typeof chatFolderItems.$inferSelect[] = [];
    if (folderIds.length > 0) {
      items = await db.select().from(chatFolderItems)
        .where(inArray(chatFolderItems.folderId, folderIds))
        .orderBy(chatFolderItems.sortOrder);
    }

    const itemsByFolder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByFolder.get(item.folderId) ?? [];
      list.push(item);
      itemsByFolder.set(item.folderId, list);
    }

    return {
      folders: folders.map((folder) => ({
        ...serializeFolder(folder),
        items: (itemsByFolder.get(folder.id) ?? []).map(serializeItem)
      }))
    };
  });

  // ─── Create folder ───

  fastify.post('/api/v1/folders', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateFolderRequestSchema.parse(request.body);
    const serialized = await db.transaction(async (tx) => {
      const [folder] = await tx.insert(chatFolders).values({
        userId: request.authUser!.userId,
        name: body.name,
        icon: body.icon ?? null,
        color: body.color ?? null
      }).returning();

      const payload = serializeFolder(folder);
      await appendSyncEvent({
        scope: 'user',
        userId: request.authUser!.userId,
        actorUserId: request.authUser!.userId,
        entityId: folder.id,
        op: { type: 'folder.upsert', payload }
      }, tx);
      return payload;
    });

    return { folder: serialized };
  });

  // ─── Update folder ───

  fastify.patch('/api/v1/folders/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = UpdateFolderRequestSchema.parse(request.body);
    await assertFolderOwner(params.id, request.authUser!.userId);

    const serialized = await db.transaction(async (tx) => {
      const [updated] = await tx.update(chatFolders)
        .set({
          ...(body.name !== undefined && { name: body.name }),
          ...(body.icon !== undefined && { icon: body.icon }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder })
        })
        .where(eq(chatFolders.id, params.id))
        .returning();

      const payload = serializeFolder(updated);
      await appendSyncEvent({
        scope: 'user',
        userId: request.authUser!.userId,
        actorUserId: request.authUser!.userId,
        entityId: updated.id,
        op: { type: 'folder.upsert', payload }
      }, tx);
      return payload;
    });

    return { folder: serialized };
  });

  // ─── Delete folder ───

  fastify.delete('/api/v1/folders/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    await assertFolderOwner(params.id, request.authUser!.userId);
    await db.transaction(async (tx) => {
      await tx.delete(chatFolders).where(eq(chatFolders.id, params.id));
      await appendSyncEvent({
        scope: 'user',
        userId: request.authUser!.userId,
        actorUserId: request.authUser!.userId,
        entityId: params.id,
        op: { type: 'folder.delete', payload: { folderId: params.id } }
      }, tx);
    });
    return { success: true };
  });

  // ─── Add chat to folder ───

  fastify.post('/api/v1/folders/:id/items', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = AddFolderItemRequestSchema.parse(request.body);
    await assertFolderOwner(params.id, request.authUser!.userId);

    const [membership] = await db.select().from(chatMembers)
      .where(and(eq(chatMembers.chatId, body.chatId), eq(chatMembers.userId, request.authUser!.userId)))
      .limit(1);
    if (!membership) throw forbidden('You are not a member of this chat');

    const serialized = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(chatFolderItems).values({
        folderId: params.id,
        chatId: body.chatId
      }).onConflictDoNothing({
        target: [chatFolderItems.folderId, chatFolderItems.chatId]
      }).returning();

      const item = inserted ?? (await tx.select().from(chatFolderItems)
        .where(and(eq(chatFolderItems.folderId, params.id), eq(chatFolderItems.chatId, body.chatId)))
        .limit(1))[0];
      const payload = serializeItem(item);
      await appendSyncEvent({
        scope: 'user',
        userId: request.authUser!.userId,
        actorUserId: request.authUser!.userId,
        entityId: `${params.id}:${body.chatId}`,
        op: { type: 'folder_item.upsert', payload }
      }, tx);
      return payload;
    });
    return { item: serialized };
  });

  // ─── Remove chat from folder ───

  fastify.delete('/api/v1/folders/:id/items/:chatId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string; chatId: string };
    await assertFolderOwner(params.id, request.authUser!.userId);
    await db.transaction(async (tx) => {
      await tx.delete(chatFolderItems)
        .where(and(eq(chatFolderItems.folderId, params.id), eq(chatFolderItems.chatId, params.chatId)));
      await appendSyncEvent({
        scope: 'user',
        userId: request.authUser!.userId,
        actorUserId: request.authUser!.userId,
        entityId: `${params.id}:${params.chatId}`,
        op: { type: 'folder_item.delete', payload: { folderId: params.id, chatId: params.chatId } }
      }, tx);
    });
    return { success: true };
  });

  // ─── Reorder folders ───

  fastify.patch('/api/v1/folders/reorder', { preHandler: fastify.authenticate }, async (request) => {
    const body = ReorderFoldersRequestSchema.parse(request.body);
    const userId = request.authUser!.userId;
    const folderIds = body.folders.map((f) => f.id);

    const existing = await db.select().from(chatFolders)
      .where(and(eq(chatFolders.userId, userId), inArray(chatFolders.id, folderIds)));

    if (existing.length !== folderIds.length) {
      throw notFound('One or more folders not found');
    }

    await db.transaction(async (tx) => {
      for (const entry of body.folders) {
        const folder = existing.find((item) => item.id === entry.id);
        if (!folder) continue;
        await tx.update(chatFolders)
          .set({ sortOrder: entry.sortOrder })
          .where(eq(chatFolders.id, entry.id));

        await appendSyncEvent({
          scope: 'user',
          userId,
          actorUserId: userId,
          entityId: folder.id,
          op: { type: 'folder.upsert', payload: serializeFolder({ ...folder, sortOrder: entry.sortOrder }) }
        }, tx);
      }
    });
    return { success: true };
  });
}
