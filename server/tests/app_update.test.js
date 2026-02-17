const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('../src/index');

describe('App Update Endpoint', () => {
  const downloadsDir = path.join(__dirname, '../data/downloads');
  const testApkFileName = 'test-update.apk';
  const testApkPath = path.join(downloadsDir, testApkFileName);
  const manifestPath = path.join(downloadsDir, 'app-update.json');
  let originalManifest = null;
  let originalEnvApk = null;

  beforeAll(() => {
    fs.mkdirSync(downloadsDir, { recursive: true });
    originalEnvApk = process.env.MOBILE_APK_FILENAME;
    process.env.MOBILE_APK_FILENAME = testApkFileName;

    if (fs.existsSync(manifestPath)) {
      originalManifest = fs.readFileSync(manifestPath, 'utf8');
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testApkPath)) fs.unlinkSync(testApkPath);
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
  });

  afterAll(() => {
    if (fs.existsSync(testApkPath)) fs.unlinkSync(testApkPath);
    if (originalManifest !== null) {
      fs.writeFileSync(manifestPath, originalManifest, 'utf8');
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }

    if (originalEnvApk) {
      process.env.MOBILE_APK_FILENAME = originalEnvApk;
    } else {
      delete process.env.MOBILE_APK_FILENAME;
    }
  });

  it('returns 404 when no APK exists', async () => {
    const res = await request(app).get('/api/app/update');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('No update package available');
  });

  it('returns manifest metadata when APK exists', async () => {
    fs.writeFileSync(testApkPath, 'test apk contents');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          latestVersion: '1.0.5',
          fileName: testApkFileName,
          mandatory: true,
          notes: 'Security + latency fixes',
          minSupportedVersion: '1.0.0',
          publishedAt: '2026-02-17T17:00:00.000Z',
          checksumSha256: 'abc123'
        },
        null,
        2
      ),
      'utf8'
    );

    const res = await request(app).get('/api/app/update');

    expect(res.statusCode).toBe(200);
    expect(res.body.latestVersion).toBe('1.0.5');
    expect(res.body.fileName).toBe(testApkFileName);
    expect(res.body.mandatory).toBe(true);
    expect(res.body.downloadPath).toBe(`/downloads/${testApkFileName}`);
    expect(res.body.apkUrl).toMatch(new RegExp(`/downloads/${testApkFileName}$`));
  });
});
