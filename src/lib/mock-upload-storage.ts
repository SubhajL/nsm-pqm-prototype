import { put } from '@vercel/blob';
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

function buildStoredPath(segments: string[], finalFilename: string) {
  return path.join(...segments, finalFilename).replace(/\\/g, '/');
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isHostedRuntime() {
  return process.env.VERCEL === '1';
}

async function persistBlobUpload(
  file: File,
  relativePath: string,
): Promise<StoredMockUpload> {
  const blob = await put(relativePath, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type || 'application/octet-stream',
  });

  return {
    filename: file.name,
    url: blob.url,
    mimeType: file.type || blob.contentType || 'application/octet-stream',
    sizeBytes: file.size,
  };
}

async function persistFilesystemUpload(
  file: File,
  relativePath: string,
): Promise<StoredMockUpload> {
  const absolutePath = path.join(process.cwd(), 'public', 'mock-uploads', relativePath);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    filename: file.name,
    url: `/mock-uploads/${relativePath}`,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}

export async function persistMockUpload(
  file: File,
  segments: string[],
): Promise<StoredMockUpload> {
  const safeFilename = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const finalFilename = `${timestamp}-${safeFilename}`;
  const relativePath = buildStoredPath(segments, finalFilename);

  if (shouldUseBlobStorage()) {
    return persistBlobUpload(file, relativePath);
  }

  if (isHostedRuntime()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required for uploads in hosted environments',
    );
  }

  return persistFilesystemUpload(file, relativePath);
}
