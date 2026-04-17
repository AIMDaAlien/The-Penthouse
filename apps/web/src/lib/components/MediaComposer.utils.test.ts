import { describe, it, expect } from 'vitest';
import {
  classifyMediaKind,
  computeColumns,
  formatFileSize,
  getTotalSize,
  getPrimaryKind
} from './MediaComposer.utils';

describe('classifyMediaKind', () => {
  it('classifies image MIME types as image', () => {
    expect(classifyMediaKind({ type: 'image/jpeg', name: 'photo.jpg' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/png', name: 'photo.png' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/webp', name: 'photo.webp' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/gif', name: 'anim.gif' })).toBe('image');
  });

  it('classifies video MIME types as video', () => {
    expect(classifyMediaKind({ type: 'video/mp4', name: 'clip.mp4' })).toBe('video');
    expect(classifyMediaKind({ type: 'video/webm', name: 'clip.webm' })).toBe('video');
    expect(classifyMediaKind({ type: 'video/quicktime', name: 'clip.mov' })).toBe('video');
  });

  it('classifies all other MIME types as file', () => {
    expect(classifyMediaKind({ type: 'application/pdf', name: 'doc.pdf' })).toBe('file');
    expect(classifyMediaKind({ type: 'text/plain', name: 'notes.txt' })).toBe('file');
    expect(classifyMediaKind({ type: 'text/csv', name: 'data.csv' })).toBe('file');
    expect(classifyMediaKind({ type: '', name: 'unknown' })).toBe('file');
  });
});

describe('computeColumns', () => {
  it('returns 1 for 0 or 1 visual items', () => {
    expect(computeColumns(0)).toBe(1);
    expect(computeColumns(1)).toBe(1);
  });

  it('returns 2 for 2–4 visual items', () => {
    expect(computeColumns(2)).toBe(2);
    expect(computeColumns(3)).toBe(2);
    expect(computeColumns(4)).toBe(2);
  });

  it('returns 3 for 5–10 visual items', () => {
    expect(computeColumns(5)).toBe(3);
    expect(computeColumns(8)).toBe(3);
    expect(computeColumns(10)).toBe(3);
  });
});

describe('formatFileSize', () => {
  it('formats byte values', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobyte values', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('2 KB');
    expect(formatFileSize(102_400)).toBe('100 KB');
  });

  it('formats megabyte values', () => {
    expect(formatFileSize(1_048_576)).toBe('1.0 MB');
    expect(formatFileSize(2_621_440)).toBe('2.5 MB');
    expect(formatFileSize(26_214_400)).toBe('25.0 MB');
  });
});

describe('getTotalSize', () => {
  it('sums sizes of all entries', () => {
    expect(getTotalSize([{ size: 100 }, { size: 200 }, { size: 300 }])).toBe(600);
  });

  it('returns 0 for an empty array', () => {
    expect(getTotalSize([])).toBe(0);
  });

  it('handles single entry', () => {
    expect(getTotalSize([{ size: 1_000_000 }])).toBe(1_000_000);
  });
});

describe('getPrimaryKind', () => {
  it('returns image when any attachment is an image', () => {
    expect(getPrimaryKind([
      { mediaKind: 'image' },
      { mediaKind: 'video' },
      { mediaKind: 'file' }
    ])).toBe('image');
  });

  it('returns video when no image but video present', () => {
    expect(getPrimaryKind([
      { mediaKind: 'video' },
      { mediaKind: 'file' }
    ])).toBe('video');
  });

  it('returns file when only file attachments', () => {
    expect(getPrimaryKind([{ mediaKind: 'file' }, { mediaKind: 'file' }])).toBe('file');
  });

  it('handles single image attachment', () => {
    expect(getPrimaryKind([{ mediaKind: 'image' }])).toBe('image');
  });
});
