import sharp from 'sharp';
import { createReadStream, createWriteStream } from 'node:fs';
import { rename, stat, unlink } from 'node:fs/promises';

export type ImagePurpose = 'avatar' | 'banner';

interface ProcessResult {
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

function isAnimatedGif(contentType: string, filePath: string): boolean {
  return contentType === 'image/gif' || filePath.toLowerCase().endsWith('.gif');
}

function streamToFile(source: NodeJS.ReadableStream, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dest = createWriteStream(destPath);
    source.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    source.on('error', reject);
  });
}

/**
 * Process an uploaded image for a specific purpose, overwriting the original file.
 *
 * Avatar:  centre-weighted 1:1 crop → 512×512. GIFs kept animated.
 * Banner:  centre-weighted 20:9 crop → 1280×576. GIFs kept animated.
 *
 * Non-GIF outputs are WebP. Returns updated metadata.
 */
export async function processImage(
  filePath: string,
  contentType: string | undefined,
  purpose: ImagePurpose
): Promise<ProcessResult> {
  const isGif = isAnimatedGif(contentType ?? '', filePath);
  const inputOptions = isGif ? { animated: true } : undefined;

  const image = sharp(filePath, inputOptions);
  const metadata = await image.clone().metadata();

  const srcW = metadata.width ?? 1;
  const srcH = metadata.height ?? 1;

  let processor: sharp.Sharp;

  if (purpose === 'avatar') {
    const target = 512;
    const crop = Math.min(srcW, srcH);
    const left = Math.round((srcW - crop) / 2);
    const top = Math.round((srcH - crop) / 2);

    processor = image
      .extract({ left, top, width: crop, height: crop })
      .resize(target, target, { fit: 'cover' });

    processor = isGif ? processor.gif() : processor.webp({ quality: 90 });
  } else {
    // banner — 20:9
    const targetW = 1280;
    const targetH = 576;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let cropW: number;
    let cropH: number;
    let left: number;
    let top: number;

    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = Math.round(cropH * targetRatio);
      left = Math.round((srcW - cropW) / 2);
      top = 0;
    } else {
      cropW = srcW;
      cropH = Math.round(cropW / targetRatio);
      left = 0;
      top = Math.round((srcH - cropH) / 2);
    }

    processor = image
      .extract({ left, top, width: cropW, height: cropH })
      .resize(targetW, targetH, { fit: 'cover' });

    processor = isGif ? processor.gif() : processor.webp({ quality: 85 });
  }

  const tmpPath = `${filePath}.tmp`;
  await processor.toFile(tmpPath);

  // Replace original with processed
  await unlink(filePath);
  await rename(tmpPath, filePath);

  const finalMeta = await sharp(filePath, inputOptions).metadata();
  const info = await stat(filePath);

  return {
    contentType: isGif ? 'image/gif' : 'image/webp',
    sizeBytes: info.size,
    width: finalMeta.width ?? 0,
    height: finalMeta.height ?? 0
  };
}
