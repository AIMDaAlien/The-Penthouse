import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, rename } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getUploadsDir(): string {
  return path.join(__dirname, '../../uploads');
}

function getLegacyUploadsDir(): string {
  return path.resolve(process.cwd(), 'services/api/uploads');
}

export async function ensureUploadsDirReady(): Promise<string> {
  const uploadDir = getUploadsDir();
  await mkdir(uploadDir, { recursive: true });

  const legacyDir = getLegacyUploadsDir();
  if (legacyDir === uploadDir) {
    return uploadDir;
  }

  try {
    const files = await readdir(legacyDir);
    await Promise.all(files.map(async (file) => {
      const from = path.join(legacyDir, file);
      const to = path.join(uploadDir, file);
      await rename(from, to).catch(() => undefined);
    }));
  } catch {
    // No legacy directory or nothing to migrate.
  }

  return uploadDir;
}
