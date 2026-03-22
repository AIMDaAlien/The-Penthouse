import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

process.env.DATABASE_URL ??= 'postgresql://penthouse:penthouse@localhost:5432/penthouse_test';
process.env.JWT_SECRET ??= 'local-test-jwt-secret-long-enough';

const tempPaths: string[] = [];

afterEach(async () => {
  const { env } = await import('../src/config/env.js');
  env.BACKUP_STATUS_PATH = '';

  const diagnostics = await import('../src/utils/operatorDiagnostics.js');
  diagnostics.resetOperatorDiagnosticsForTests();

  while (tempPaths.length > 0) {
    const target = tempPaths.pop();
    if (!target) continue;
    await rm(target, { recursive: true, force: true });
  }
});

test('backup diagnostics are unconfigured when no status path is set', async () => {
  const { env } = await import('../src/config/env.js');
  env.BACKUP_STATUS_PATH = '';

  const { getBackupDiagnostics } = await import('../src/utils/operatorDiagnostics.js');
  const backup = await getBackupDiagnostics();

  assert.deepEqual(backup, {
    status: 'unconfigured',
    target: null,
    lastSuccessfulBackupAt: null
  });
});

test('backup diagnostics read a configured status file truthfully', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'penthouse-backup-'));
  tempPaths.push(tempDir);
  const statusPath = path.join(tempDir, 'backup-status.json');
  await writeFile(statusPath, JSON.stringify({
    status: 'ok',
    target: 'nas/nightly',
    lastSuccessfulBackupAt: '2026-03-21T10:15:00.000Z'
  }));

  const { env } = await import('../src/config/env.js');
  env.BACKUP_STATUS_PATH = statusPath;

  const { getBackupDiagnostics } = await import('../src/utils/operatorDiagnostics.js');
  const backup = await getBackupDiagnostics();

  assert.deepEqual(backup, {
    status: 'ok',
    target: 'nas/nightly',
    lastSuccessfulBackupAt: '2026-03-21T10:15:00.000Z'
  });
});

test('backup diagnostics become unavailable when the file is missing or unreadable', async () => {
  const { env } = await import('../src/config/env.js');
  env.BACKUP_STATUS_PATH = path.join(os.tmpdir(), 'definitely-missing-backup-status.json');

  const { getBackupDiagnostics } = await import('../src/utils/operatorDiagnostics.js');
  const backup = await getBackupDiagnostics();

  assert.deepEqual(backup, {
    status: 'unavailable',
    target: null,
    lastSuccessfulBackupAt: null
  });
});

test('backup diagnostics become unavailable when the status file is malformed', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'penthouse-backup-malformed-'));
  tempPaths.push(tempDir);
  const statusPath = path.join(tempDir, 'backup-status.json');
  await writeFile(statusPath, '{"status":"ok",');

  const { env } = await import('../src/config/env.js');
  env.BACKUP_STATUS_PATH = statusPath;

  const { getBackupDiagnostics } = await import('../src/utils/operatorDiagnostics.js');
  const backup = await getBackupDiagnostics();

  assert.deepEqual(backup, {
    status: 'unavailable',
    target: null,
    lastSuccessfulBackupAt: null
  });
});

test('upload diagnostics cap recursive scans for operator safety', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'penthouse-uploads-'));
  tempPaths.push(tempDir);
  await writeFile(path.join(tempDir, 'first.bin'), '1111');
  await writeFile(path.join(tempDir, 'second.bin'), '2222');
  await writeFile(path.join(tempDir, 'third.bin'), '3333');

  const { scanUploadDirectory } = await import('../src/utils/operatorDiagnostics.js');
  const uploads = await scanUploadDirectory(tempDir, 2);

  assert.equal(uploads.status, 'available');
  assert.equal(uploads.fileCount, 2);
  assert.equal(uploads.scanLimited, true);
  assert.equal(typeof uploads.directoryBytes, 'number');
  assert.ok(uploads.directoryBytes !== null && uploads.directoryBytes > 0);
});

test('push and error runtime counters stay bounded to counts and timestamps', async () => {
  const diagnostics = await import('../src/utils/operatorDiagnostics.js');
  diagnostics.recordPushSendSuccess();
  diagnostics.recordPushSendFailure();
  diagnostics.recordPushStaleTokenRemoval();
  diagnostics.recordServerError('/api/v1/admin/operator/summary');
  diagnostics.recordServerError('/api/v1/media/upload');

  const push = diagnostics.getPushRuntimeDiagnostics();
  const errors = diagnostics.getErrorRuntimeDiagnostics();

  assert.deepEqual(Object.keys(push), ['successfulSends', 'failedSends', 'staleTokensRemoved', 'lastFailureAt']);
  assert.equal(push.successfulSends, 1);
  assert.equal(push.failedSends, 1);
  assert.equal(push.staleTokensRemoved, 1);
  assert.ok(push.lastFailureAt);

  assert.equal(errors.serverErrorCount, 2);
  assert.ok(errors.lastServerErrorAt);
  assert.deepEqual(errors.routeGroups, [
    { group: 'admin', count: 1 },
    { group: 'media', count: 1 }
  ]);
});

test('server error diagnostics record real 500 responses through the app hook', async () => {
  const { createApp } = await import('../src/app.js');
  const diagnostics = await import('../src/utils/operatorDiagnostics.js');
  const app = await createApp();

  try {
    app.get('/boom', async () => {
      throw new Error('boom');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/boom'
    });

    assert.equal(response.statusCode, 500);

    const errors = diagnostics.getErrorRuntimeDiagnostics();
    assert.equal(errors.serverErrorCount, 1);
    assert.ok(errors.lastServerErrorAt);
    assert.deepEqual(errors.routeGroups, [
      { group: 'other', count: 1 }
    ]);
  } finally {
    await app.close();
  }
});
