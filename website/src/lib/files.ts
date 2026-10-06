import { useEffect, useState } from 'react';
import { getProperties, getUrl, uploadData } from 'aws-amplify/storage';

/**
 * File helpers. Keys stored in the database are S3 paths ("site/news/…",
 * "members/<identity>/…"). Keys starting with "/" or "http" are static files or
 * external links and are used as-is.
 */
const urlCache = new Map<string, Promise<string>>();

export function fileUrl(key: string): Promise<string> {
  if (!key) return Promise.resolve('');
  if (key.startsWith('/') || /^https?:/.test(key)) return Promise.resolve(key);
  let p = urlCache.get(key);
  if (!p) {
    p = getUrl({ path: key, options: { expiresIn: 6 * 3600 } })
      .then((r) => r.url.toString())
      .catch(() => {
        urlCache.delete(key);
        return '';
      });
    urlCache.set(key, p);
  }
  return p;
}

export function useFileUrl(key?: string | null): string {
  const [url, setUrl] = useState(() => (key && (key.startsWith('/') || /^https?:/.test(key)) ? key : ''));
  useEffect(() => {
    let alive = true;
    if (!key) setUrl('');
    else void fileUrl(key).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [key]);
  return url;
}

const RESIZABLE = /^image\/(jpeg|png|webp|heic|heif)$/;

/** Shrinks large photos in the browser (max 2000 px, JPEG) so pages stay fast and storage stays cheap. */
export async function prepareImage(file: File, maxDim = 2000): Promise<File> {
  if (!RESIZABLE.test(file.type) || (file.size < 900_000 && maxDim >= 2000)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_500_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|heic|heif|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function sha256(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const safeName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80) || 'file';

/**
 * Where an upload goes:
 *   { area: 'site', folder: 'news' }  → site/news/…        (staff)
 *   { area: 'members' }               → members/<you>/…    (your own files)
 *   { area: 'submissions' }           → submissions/<you>/…
 */
export type UploadTarget = { area: 'site'; folder: string } | { area: 'members' } | { area: 'submissions' };

export type UploadResult = { key: string; hash: string; skipped: boolean; size: number; name: string; type: string };

/**
 * Uploads one file. The key contains the file's SHA-256 fingerprint, so the same
 * file uploaded twice (from any tab, by anyone) is stored once and the second
 * upload is skipped as a duplicate.
 */
export async function uploadFile(
  original: File,
  target: UploadTarget,
  identityId: string | undefined,
  onProgress?: (fraction: number) => void,
  signal?: { cancel?: () => void },
): Promise<UploadResult> {
  const file = original.type.startsWith('image/') ? await prepareImage(original) : original;
  const hash = await sha256(file);
  const base = `${hash.slice(0, 16)}-${safeName(file.name)}`;
  let key: string;
  if (target.area === 'site') key = `site/${target.folder}/${base}`;
  else {
    if (!identityId) throw new Error('Not signed in.');
    key = `${target.area}/${identityId}/${base}`;
  }
  try {
    await getProperties({ path: key });
    onProgress?.(1);
    return { key, hash, skipped: true, size: file.size, name: file.name, type: file.type };
  } catch {
    /* not uploaded yet */
  }
  const task = uploadData({
    path: key,
    data: file,
    options: {
      contentType: file.type || 'application/octet-stream',
      onProgress: ({ transferredBytes, totalBytes }) => onProgress?.(totalBytes ? transferredBytes / totalBytes : 0),
    },
  });
  if (signal) signal.cancel = () => task.cancel();
  await task.result;
  onProgress?.(1);
  return { key, hash, skipped: false, size: file.size, name: file.name, type: file.type };
}
