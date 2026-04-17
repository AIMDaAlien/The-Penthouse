# Media Uploads — Design Spec

**Date:** 2026-04-17
**Branch:** `pwa`
**Target version:** v2.2.0-alpha
**Owner:** Claude (frontend), Codex (backend — already complete)

---

## Summary

Add full media upload support to the chat composer. Users can attach up to 10 files (images, videos, or documents) totalling up to 25 MB per message, write an optional caption, and send them as a single message that renders as a tight grid bubble in the conversation.

The backend upload endpoint (`POST /api/v1/media/upload`), rate limiting, and all contract types are already implemented by Codex. This spec covers frontend work only.

---

## Scope

### In scope
- File picker in the chat composer (images, video, text/document files)
- Preview strip with real thumbnails before send
- Optional caption field (renders above the media grid)
- Parallel upload queue with per-file progress indicators (SVG-based)
- Per-file error state with retry
- Media grid bubble renderer in the message list (tight grid, 1→2→3 columns)
- File download chips for non-visual attachments
- Backwards compatibility: plain text messages unaffected

### Out of scope
- Lightbox / full-screen image viewer (post-MVP)
- Video playback controls UI (browser defaults used)
- Upload progress notification when navigating away
- Admin moderation of media

---

## Architecture

### Approach: Extracted components (B)

Two new self-contained components handle all complexity. The chat page wires them in without owning upload state.

```
apps/web/src/lib/components/
  MediaComposer.svelte   ← file picker, preview grid, caption, upload queue
  MediaBubble.svelte     ← message renderer for media messages

apps/web/src/routes/chat/[id]/+page.svelte
  ← integrates both; switches composer mode when files are queued
```

---

## Data Flow

```
1. User taps attach button (paperclip SVG icon)
2. <input type="file"> opens, accept="image/*,video/*,.pdf,.txt,.md,.json,.csv"
   multiple, max 10 files
3. MediaComposer takes over input area:
   - Caption field (top)
   - Preview grid (thumbnails via URL.createObjectURL)
   - File count · total size bar + Send button
4. On send:
   - All files upload in parallel via XHR (for upload progress events)
   - POST /api/v1/media/upload — one request per file
   - Authorization: Bearer <accessToken>
   - Each cell shows a thin progress arc (0–100%)
5. When all XHRs resolve successfully:
   - Emit socket message.send with:
       type: 'image' | 'video' | 'file'   (highest-priority mediaKind present)
       content: <caption string, may be empty>
       metadata: {
         attachments: [
           { uploadId, url, mediaKind, fileName, size }
         ]
       }
6. Chat page calls onSent() → scroll to bottom
7. MediaComposer clears state, revokes all object URLs
8. Receiving side: MediaBubble reads message.metadata.attachments and renders
```

---

## MediaComposer Component

**File:** `apps/web/src/lib/components/MediaComposer.svelte`

### Props
```typescript
interface Props {
  chatId: string;
  accessToken: string;
  apiBaseUrl: string;
  onSent: () => void;
}
```

### Internal State
```typescript
type FileEntry = {
  id: string;              // crypto.randomUUID()
  file: File;
  previewUrl: string;      // URL.createObjectURL(file)
  videoFrameUrl?: string;  // extracted first frame for video thumbnails
  mediaKind: 'image' | 'video' | 'file';
  progress: number;        // 0–100
  uploadId: string | null;
  url: string | null;
  error: string | null;
};

let files: FileEntry[] = $state([]);
let caption: string = $state('');
let uploading: boolean = $state(false);
```

### Layout (top → bottom)
```
┌─────────────────────────────────────────┐
│  Caption field  "Add a caption..."      │
│─────────────────────────────────────────│
│  Preview grid (thumbnails)              │
│  [img][img][img]                        │
│  [img][img][doc chip]                   │
│─────────────────────────────────────────│
│  10 files · 18.2 MB    [+ Add] [Send ↑] │
└─────────────────────────────────────────┘
```

### Grid column rules
| File count | Columns |
|---|---|
| 1 | 1 (full width) |
| 2–4 | 2 |
| 5–10 | 3 |

Cells are square with `aspect-ratio: 1`, `object-fit: cover`. Non-visual files (mediaKind === 'file') render as a name + size chip below the grid, not in cells.

### Progress overlay
Each image/video cell shows a thin circular SVG arc overlay (0–100%) while its XHR is in flight. On completion the overlay fades out. On error, the cell gets a red tint and a retry SVG icon button.

### Upload mechanics
- `XMLHttpRequest` per file (fetch does not expose upload progress)
- All XHRs fired in parallel via `Promise.allSettled`
- `xhr.upload.onprogress` updates the file's `progress` field
- Send button disabled while any file has `progress < 100` or `error !== null`
- Retry: re-runs XHR for that file only, clears error state

### Adding more files
The `[+ Add]` button re-opens the file picker with the same `accept` filter. Selected files are appended to the existing queue up to the 10-file cap. Files already uploaded (progress = 100) are not re-uploaded. The total-size guard runs again against the new cumulative total.

### Validation (client-side)
- Max 10 files — additional files beyond 10 are rejected with a toast
- Max 25 MB total — enforced before any upload begins
- Accepted MIME types enforced via `accept` attribute; if a file slips through and the server returns 415, a per-file toast shows the filename

### Cleanup
- `URL.revokeObjectURL` called on every `previewUrl` and `videoFrameUrl` on component `ondestroy` and after a successful send

---

## MediaBubble Component

**File:** `apps/web/src/lib/components/MediaBubble.svelte`

### Props
```typescript
interface Props {
  message: Message;   // from @penthouse/contracts
  apiBaseUrl: string;
}
```

### Rendering logic
```
if message.content (non-empty):
  <p class="caption">{ message.content }</p>

if attachments (visual — image or video):
  <div class="media-grid cols-{columnCount}">
    for each visual attachment:
      if mediaKind === 'image':
        <img src="{apiBaseUrl}{url}" loading="lazy" />
      if mediaKind === 'video':
        <video src="{apiBaseUrl}{url}" autoplay muted loop playsinline />
      if count > max_cells (5 for 3-col, 4 for 2-col):
        last visible cell gets +N overlay
  </div>

for each file attachment (mediaKind === 'file'):
  <div class="file-chip">
    <svg ...file icon />
    <div>
      <span class="name">{ fileName }</span>
      <span class="size">{ formattedSize }</span>
    </div>
    <a href="{apiBaseUrl}{url}" download>
      <svg ...download icon />
    </a>
  </div>
```

### +N overflow
- 2-col layout: show max 4 cells, last cell shows `+N` overlay if more
- 3-col layout: show max 6 cells, last cell shows `+N` overlay if more
- Clicking the `+N` cell expands to show all (toggle, no navigation)

### Backwards compatibility
If `message.metadata?.attachments` is absent or empty, the component renders nothing (the chat page falls back to the plain text bubble). No existing messages are affected.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Upload fails (network) | Cell → red tint + retry SVG button. Send locked. |
| 413 File too large | Toast: "filename.jpg is too large (max 25 MB)" |
| 415 Unsupported type | Toast: "filename.xyz is not a supported file type" |
| 429 Rate limit | Toast: "Upload limit reached. Try again in Xm" (X from `retryAfterSeconds`) |
| >10 files selected | Extra files silently dropped; toast: "Max 10 files per message" |
| >25 MB total | Toast before any upload begins: "Total size exceeds 25 MB" |
| All uploads ok, socket fails | Toast: "Failed to send — tap to retry" (reuses existing send retry logic) |

---

## Task Split (3-file rule)

### Task 1 — MediaComposer + Icon additions
Files touched:
1. `apps/web/src/lib/components/MediaComposer.svelte` (new)
2. `apps/web/src/lib/components/Icon.svelte` (add: `paperclip`, `download`, `file`, `x-circle`, `rotate-ccw`)

### Task 2 — MediaBubble
Files touched:
1. `apps/web/src/lib/components/MediaBubble.svelte` (new)

### Task 3 — Wire into chat page
Files touched:
1. `apps/web/src/routes/chat/[id]/+page.svelte`
   - Import and mount `<MediaComposer>` (shown when `files.length > 0`)
   - Import and mount `<MediaBubble>` for messages where `message.type !== 'text'`
   - Attach button added to composer bar (triggers hidden file input)

---

## Message Metadata Schema

The `metadata.attachments` array shape (frontend-defined, stored in the existing `MessageMetadata` free-form record):

```typescript
type MediaAttachment = {
  uploadId: string;    // UUID from UploadResponse.id
  url: string;         // relative path, e.g. /uploads/abc123.jpg
  mediaKind: 'image' | 'video' | 'file';
  fileName: string;    // original file name for display
  size: number;        // bytes
};
```

The `message.type` field is set to the highest-priority `mediaKind` present:
- Any image → `'image'`
- No image, any video → `'video'`
- Only files → `'file'`

This ensures the existing `MessageTypeSchema` enum is satisfied without schema changes.

---

## Icons Required

All SVG, stroke-based, consistent with the existing Lucide-style `<Icon>` component:

| Name | Usage |
|---|---|
| `paperclip` | Attach button in composer bar |
| `download` | Download action on file chips |
| `file` | Placeholder for file attachments in grid/chips |
| `x-circle` | Remove file from queue |
| `rotate-ccw` | Retry failed upload |

Check `Icon.svelte` for existing icon names before adding duplicates.

---

## Definition of Done

1. User can attach 1–10 files in the composer and see real thumbnails
2. Upload progress shows per-file in the preview grid
3. On send, one message appears in the thread with the media grid
4. Recipients see the same grid rendered correctly
5. File chips for documents are downloadable
6. Error states (429, 413, network) show appropriate toasts with no crash
7. TypeScript compiles clean (`npm run typecheck`)
8. No regressions in plain text messaging
