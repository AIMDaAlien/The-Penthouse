export type MediaKind = 'image' | 'video' | 'file';

export type FileEntry = {
  id: string;
  file: File;
  previewUrl: string;   // blob: URL for images/video; '' for file attachments
  mediaKind: MediaKind;
  progress: number;     // 0–100
  uploadId: string | null;
  url: string | null;   // relative path from server, e.g. /uploads/abc.jpg
  error: string | null;
};

export type MediaAttachment = {
  uploadId: string;
  url: string;        // /uploads/abc.jpg (server) or blob: URL (optimistic)
  previewUrl: string; // blob: URL — always present for optimistic rendering
  mediaKind: MediaKind;
  fileName: string;
  size: number;
};

export type MediaSendPayload = {
  caption: string;
  primaryKind: MediaKind;
  attachments: MediaAttachment[];
};

/**
 * Classify a file's media kind from its MIME type.
 * Accepts any object with a `type` string — avoids importing File in tests.
 * Extension-based fallback (using `name`) is not implemented; MIME type is authoritative.
 */
export function classifyMediaKind(file: { type: string }): MediaKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

/**
 * Number of grid columns based on the count of visual (image/video) items.
 * 1 item -> 1 col, 2-4 items -> 2 cols, 5-10 items -> 3 cols.
 */
export function computeColumns(visualCount: number): 1 | 2 | 3 {
  if (visualCount <= 1) return 1;
  if (visualCount <= 4) return 2;
  return 3;
}

/**
 * Human-readable file size string.
 * - Bytes: exact integer (e.g. "512 B")
 * - Kilobytes: rounded to nearest whole number (e.g. "2 KB")
 * - Megabytes: one decimal place (e.g. "2.5 MB") — precision matters at this scale
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Sum of sizes for an array of objects with a `size` number field.
 */
export function getTotalSize(files: { size: number }[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * Determine the `MessageType` to use for a message based on what was attached.
 * Priority: image > video > file. Matches the MessageTypeSchema enum.
 * If called with an empty array, returns 'file' as a safe default —
 * callers must ensure at least one attachment is present before calling.
 */
export function getPrimaryKind(attachments: { mediaKind: MediaKind }[]): MediaKind {
  if (attachments.some((a) => a.mediaKind === 'image')) return 'image';
  if (attachments.some((a) => a.mediaKind === 'video')) return 'video';
  return 'file';
}
