import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { IFileValidator, ValidationResult } from '../interfaces/IFileValidator';
import { config } from '../config';

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.txt': ['text/plain'],
  '.zip': ['application/zip'],
  '.rar': ['application/x-rar-compressed'],
  '.7z': ['application/x-7z-compressed'],
};

const ALLOWED_EXTENSIONS = Object.keys(EXTENSION_MIME_MAP);

const UNSAFE_PREVIEW_MIME = [
  'text/html', 'text/javascript', 'application/javascript',
  'application/x-javascript', 'text/ecmascript', 'application/ecmascript',
  'image/svg+xml', 'application/xml', 'text/xml',
  'application/x-httpd-php',
];

const MAGIC_BYTE_CHECKS: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  ],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  'application/zip': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/x-rar-compressed': [{ offset: 0, bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] }],
  'application/msword': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.ms-excel': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'text/plain': [],
};

export class FileValidatorService implements IFileValidator {
  validateExtension(fileName: string): ValidationResult {
    const ext = path.extname(fileName).toLowerCase();
    if (!ext) {
      return { valid: false, mimeType: 'application/octet-stream', error: 'File has no extension', statusCode: 415 };
    }
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, mimeType: 'application/octet-stream', error: 'File extension ' + ext + ' is not allowed', statusCode: 415 };
    }
    return { valid: true, mimeType: EXTENSION_MIME_MAP[ext][0] };
  }

  validateMagicBytes(filePath: string, declaredMime: string): ValidationResult {
    if (!fs.existsSync(filePath)) {
      return { valid: false, mimeType: declaredMime, error: 'Temp file not found', statusCode: 500 };
    }
    const checks = MAGIC_BYTE_CHECKS[declaredMime];
    if (!checks || checks.length === 0) {
      return { valid: true, mimeType: declaredMime };
    }
    let fd: number = -1;
    try {
      const maxLen = Math.max(...checks.map(c => c.offset + c.bytes.length));
      const buf = Buffer.alloc(maxLen);
      fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, maxLen, 0);
      for (const check of checks) {
        const slice = buf.slice(check.offset, check.offset + check.bytes.length);
        if (slice.equals(Buffer.from(check.bytes))) {
          return { valid: true, mimeType: declaredMime };
        }
      }
      return { valid: false, mimeType: declaredMime, error: 'File content does not match declared type ' + declaredMime, statusCode: 422 };
    } catch (e: any) {
      return { valid: false, mimeType: declaredMime, error: 'Failed to validate file content: ' + e.message, statusCode: 500 };
    } finally {
      if (fd >= 0) {
        try { fs.closeSync(fd); } catch { /* ignore */ }
      }
    }
  }

  validateSize(fileSize: number): ValidationResult {
    const maxSize = config.upload.maxSize;
    if (fileSize > maxSize) {
      return { valid: false, mimeType: 'application/octet-stream', error: 'File too large (max ' + this.formatSize(maxSize) + ')', statusCode: 413 };
    }
    if (fileSize <= 0) {
      return { valid: false, mimeType: 'application/octet-stream', error: 'File is empty', statusCode: 400 };
    }
    return { valid: true, mimeType: 'application/octet-stream' };
  }

  async validateQuota(entityType: string, entityId: string): Promise<ValidationResult> {
    const current = await prisma.file.count({
      where: { entityType, entityId, deletedAt: null },
    });
    const limit = config.upload.maxFilesPerEntity;
    if (current >= limit) {
      return { valid: false, mimeType: 'application/octet-stream', error: 'Max ' + limit + ' files per entity reached', statusCode: 409 };
    }
    return { valid: true, mimeType: 'application/octet-stream' };
  }

  async validateChain(filePath: string, fileName: string, declaredMime: string, fileSize: number, entityType: string, entityId: string): Promise<ValidationResult> {
    const extResult = this.validateExtension(fileName);
    if (!extResult.valid) return extResult;

    const sizeResult = this.validateSize(fileSize);
    if (!sizeResult.valid) return sizeResult;

    const magicResult = this.validateMagicBytes(filePath, declaredMime);
    if (!magicResult.valid) return magicResult;

    const quotaResult = await this.validateQuota(entityType, entityId);
    if (!quotaResult.valid) return quotaResult;

    return { valid: true, mimeType: declaredMime };
  }

  isUnsafePreview(mimeType: string): boolean {
    return UNSAFE_PREVIEW_MIME.some(p => mimeType.startsWith(p));
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
