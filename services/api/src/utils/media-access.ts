import { createHmac, timingSafeEqual } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/pool.js';
import { mediaUploads } from '../db/schema.js';
import { forbidden } from './error-responses.js';

const PRIVATE_MEDIA_TTL_SECONDS = 15 * 60;
const MEDIA_URL_KEYS = ['url', 'audioUrl', 'videoUrl', 'imageUrl', 'fileUrl'] as const;
const PRIVATE_MEDIA_PATH_RE = /\/api\/v1\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=$|[?#])/i;

type DbReader = Pick<typeof db, 'select'>;
type MessageMetadata = Record<string, unknown>;
type SignedMediaPayload = {
  mediaId: string;
  exp: number;
};

export function publicMediaUrl(mediaId: string) {
  return `/api/v1/media/public/${mediaId}`;
}

export function privateMediaUrl(mediaId: string) {
  return `/api/v1/media/${mediaId}`;
}

export function signedPrivateMediaPath(mediaId: string, now = new Date()) {
  const payload: SignedMediaPayload = {
    mediaId,
    exp: Math.floor(now.getTime() / 1000) + PRIVATE_MEDIA_TTL_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `/api/v1/media/signed/${encodedPayload}/${signature}`;
}

export function verifySignedPrivateMediaToken(token: string, now = new Date()) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) throw forbidden('Invalid media link', 'MEDIA_LINK_INVALID');

  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) throw forbidden('Invalid media link', 'MEDIA_LINK_INVALID');

  let payload: SignedMediaPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SignedMediaPayload;
  } catch {
    throw forbidden('Invalid media link', 'MEDIA_LINK_INVALID');
  }

  if (!payload.mediaId || !Number.isSafeInteger(payload.exp)) {
    throw forbidden('Invalid media link', 'MEDIA_LINK_INVALID');
  }
  if (payload.exp < Math.floor(now.getTime() / 1000)) {
    throw forbidden('Media link expired', 'MEDIA_LINK_EXPIRED');
  }
  return payload.mediaId;
}

export async function assertMessageMediaRefsAllowed(
  metadata: unknown,
  senderId: string,
  reader: DbReader = db
) {
  const mediaIds = mediaIdsFromMetadata(metadata);
  if (mediaIds.length === 0) return;

  const rows = await reader.select({
    id: mediaUploads.id,
    uploaderId: mediaUploads.uploaderId,
    scope: mediaUploads.scope
  }).from(mediaUploads).where(inArray(mediaUploads.id, mediaIds));

  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const mediaId of mediaIds) {
    const row = byId.get(mediaId);
    if (!row || (row.scope !== 'public' && row.uploaderId !== senderId)) {
      throw forbidden('You cannot attach this media upload', 'MEDIA_ATTACH_FORBIDDEN');
    }
  }
}

export async function rewriteMessageMediaUrls(
  metadata: unknown,
  senderId: string,
  reader: DbReader = db
) {
  if (!isMetadataObject(metadata)) return metadata;

  const rewritten: MessageMetadata = { ...metadata };
  const mediaIds = mediaIdsFromMetadata(metadata);
  if (mediaIds.length === 0) return rewritten;

  const rows = await reader.select({
    id: mediaUploads.id,
    uploaderId: mediaUploads.uploaderId,
    scope: mediaUploads.scope
  }).from(mediaUploads).where(inArray(mediaUploads.id, mediaIds));
  const signableIds = new Set(
    rows
      .filter((row) => row.scope === 'private' && row.uploaderId === senderId)
      .map((row) => row.id)
  );

  for (const key of MEDIA_URL_KEYS) {
    const value = rewritten[key];
    if (typeof value !== 'string') continue;
    const mediaId = mediaIdFromUrl(value);
    if (!mediaId || !signableIds.has(mediaId)) continue;
    rewritten[key] = replaceMediaUrl(value, signedPrivateMediaPath(mediaId));
  }

  return rewritten;
}

function mediaIdsFromMetadata(metadata: unknown) {
  if (!isMetadataObject(metadata)) return [];
  return [...new Set(
    MEDIA_URL_KEYS
      .map((key) => metadata[key])
      .filter((value): value is string => typeof value === 'string')
      .map(mediaIdFromUrl)
      .filter((value): value is string => Boolean(value))
  )];
}

function mediaIdFromUrl(value: string) {
  return PRIVATE_MEDIA_PATH_RE.exec(value)?.[1] ?? null;
}

function replaceMediaUrl(original: string, signedPath: string) {
  try {
    const parsed = new URL(original);
    return `${parsed.origin}${signedPath}`;
  } catch {
    return signedPath;
  }
}

function isMetadataObject(value: unknown): value is MessageMetadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sign(encodedPayload: string) {
  return createHmac('sha256', env.JWT_SECRET).update(encodedPayload).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
