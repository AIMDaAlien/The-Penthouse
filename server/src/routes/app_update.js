const express = require('express');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const downloadsDir = path.join(__dirname, '../../data/downloads');
const manifestPath = path.join(downloadsDir, 'app-update.json');
const defaultApkFileName = 'the-penthouse.apk';
const defaultVersion = '1.0.0';

const safeParseJson = (input) => {
  try {
    return JSON.parse(input);
  } catch (_) {
    return null;
  }
};

const getForwardedProto = (req) => {
  const raw = req.headers['x-forwarded-proto'];
  if (!raw) return req.protocol || 'https';
  return String(raw).split(',')[0].trim() || 'https';
};

router.get('/update', asyncHandler(async (req, res) => {
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = safeParseJson(raw) || {};
  }

  const version = String(
    manifest.latestVersion ||
    process.env.MOBILE_LATEST_VERSION ||
    defaultVersion
  );
  const fileName = path.basename(
    String(manifest.fileName || process.env.MOBILE_APK_FILENAME || defaultApkFileName)
  );
  const mandatory = Boolean(
    manifest.mandatory === true ||
    process.env.MOBILE_UPDATE_MANDATORY === 'true'
  );
  const notes = String(manifest.notes || process.env.MOBILE_UPDATE_NOTES || '');
  const minSupportedVersion = manifest.minSupportedVersion
    ? String(manifest.minSupportedVersion)
    : null;
  const publishedAt = manifest.publishedAt ? String(manifest.publishedAt) : null;
  const checksumSha256 = manifest.checksumSha256 ? String(manifest.checksumSha256) : null;

  const apkPath = path.join(downloadsDir, fileName);
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ error: 'No update package available' });
  }

  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = getForwardedProto(req);
  const downloadPath = `/downloads/${fileName}`;
  const apkUrl = `${proto}://${host}${downloadPath}`;

  res.json({
    app: 'The Penthouse',
    latestVersion: version,
    mandatory,
    notes,
    minSupportedVersion,
    publishedAt,
    checksumSha256,
    fileName,
    downloadPath,
    apkUrl
  });
}));

module.exports = router;
