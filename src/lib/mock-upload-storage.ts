import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function sanitizeFilename(filename: string) {
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const basename = parts.join('.') || 'file';
  const safeBase = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';
  const safeExt = extension?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export interface StoredMockUpload {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export async function persistMockUpload(
  file: File,
  segments: string[],
): Promise<StoredMockUpload> {
  const safeFilename = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const finalFilename = `${timestamp}-${safeFilename}`;
  const relativeDir = path.join('mock-uploads', ...segments);
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
  const absolutePath = path.join(absoluteDir, finalFilename);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    filename: file.name,
    url: `/${path.join(relativeDir, finalFilename).replace(/\\/g, '/')}`,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}
