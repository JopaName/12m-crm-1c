import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../db';
import { IStorageProvider } from '../interfaces/IStorageProvider';
import { IFileValidator } from '../interfaces/IFileValidator';
import { IFileService, UploadResult, DownloadResult, PreviewResult, FileMeta, ListOptions, ListResult } from '../interfaces/IFileService';
import { LocalStorageProvider } from '../storage/providers/LocalStorageProvider';
import { FileValidatorService } from './FileValidatorService';
import { logError } from '../utils/logger';

const SINGLE_FIELDS = ['fileDraft', 'fileSigned', 'photoBefore', 'photoAfter', 'clientSignature'];

const MODEL_MAP: Record<string, string> = {
  legal: 'legalDocument',
  telemetry: 'telemetryReading',
  installation: 'installationTask',
  deal: 'deal',
  service: 'serviceCase',
};

export class FileService implements IFileService {
  private storage: IStorageProvider;
  private validator: IFileValidator;

  constructor(storage?: IStorageProvider, validator?: IFileValidator) {
    this.storage = storage || new LocalStorageProvider();
    this.validator = validator || new FileValidatorService();
  }

  getStorage(): IStorageProvider {
    return this.storage;
  }

  async upload(tempPath: string, originalName: string, declaredMime: string, fileSize: number, entityType: string, entityId: string, fieldName: string, userId: string): Promise<UploadResult> {
    const validation = await this.validator.validateChain(tempPath, originalName, declaredMime, fileSize, entityType, entityId);
    if (!validation.valid) {
      this.cleanupTemp(tempPath);
      const err = new Error(validation.error!) as any;
      err.statusCode = validation.statusCode || 400;
      throw err;
    }

    if (!(await this.checkEntityAccess(entityType, entityId, userId, ''))) {
      this.cleanupTemp(tempPath);
      const err = new Error('Access denied for this entity') as any;
      err.statusCode = 403;
      throw err;
    }

    const checksum = await this.computeChecksum(tempPath);

    return prisma.$transaction(async (tx) => {
      if (SINGLE_FIELDS.includes(fieldName)) {
        const old = await tx.file.findFirst({ where: { entityType, entityId, fieldName, deletedAt: null } });
        if (old) {
          await this.storage.delete(old.storageName);
          await tx.file.update({ where: { id: old.id }, data: { deletedAt: new Date(), deletedById: userId } });
        }
      }

      const ext = path.extname(originalName) || '';
      const storageName = crypto.randomUUID() + ext;

      await this.storage.saveFromPath(storageName, tempPath);

      const currentMax = await tx.file.findFirst({
        where: { entityType, entityId, fieldName },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (currentMax?.version || 0) + 1;

      const record = await tx.file.create({
        data: {
          originalName,
          storageName,
          mimeType: declaredMime,
          sizeBytes: fileSize,
          checksum,
          entityType,
          entityId,
          fieldName,
          version: nextVersion,
          uploadedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'File',
          entityId: record.id,
          action: 'UPLOAD',
          userId,
          newValue: JSON.stringify({ entityType, entityId, fieldName, originalName, fileSize, mimeType: declaredMime }),
        },
      });

      if (SINGLE_FIELDS.includes(fieldName)) {
        await this.updateParentField(tx, entityType, entityId, fieldName, storageName);
      }

      return {
        id: record.id,
        originalName: record.originalName,
        storageName: record.storageName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        checksum: record.checksum,
        entityType: record.entityType,
        entityId: record.entityId,
        fieldName: record.fieldName,
        version: record.version,
        createdAt: record.createdAt,
      };
    });
  }

  async download(id: string, userId: string, roleName: string): Promise<DownloadResult> {
    const record = await prisma.file.findUnique({ where: { id } });
    if (!record) {
      const err = new Error('File not found') as any;
      err.statusCode = 404;
      throw err;
    }
    if (record.deletedAt) {
      const err = new Error('File has been deleted') as any;
      err.statusCode = 410;
      throw err;
    }

    const access = await this.checkAccess(id, userId, roleName);
    if (!access) {
      const err = new Error('Access denied') as any;
      err.statusCode = 403;
      throw err;
    }

    const fileSize = this.storage.getFileSize(record.storageName);
    const stream = this.storage.createReadStream(record.storageName);

    return {
      stream,
      record: {
        id: record.id,
        originalName: record.originalName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        entityType: record.entityType,
        entityId: record.entityId,
        previewEnabled: record.previewEnabled,
        deletedAt: record.deletedAt,
      },
      fileSize: fileSize || record.sizeBytes,
    };
  }

  async preview(id: string, userId: string, roleName: string, range?: string): Promise<PreviewResult> {
    const result = await this.download(id, userId, roleName);

    if (this.validator.isUnsafePreview(result.record.mimeType)) {
      const err = new Error('File type cannot be previewed') as any;
      err.statusCode = 415;
      throw err;
    }

    const disposition = result.record.mimeType.startsWith('image/') || result.record.mimeType === 'application/pdf' || result.record.mimeType === 'text/plain'
      ? 'inline' as const
      : 'attachment' as const;

    return {
      stream: result.stream,
      mimeType: result.record.mimeType,
      sizeBytes: result.fileSize,
      disposition,
    };
  }

  async getMeta(id: string, userId: string, roleName: string): Promise<FileMeta> {
    const record = await prisma.file.findUnique({ where: { id } });
    if (!record) {
      const err = new Error('File not found') as any;
      err.statusCode = 404;
      throw err;
    }

    const access = await this.checkAccess(id, userId, roleName);
    if (!access) {
      const err = new Error('Access denied') as any;
      err.statusCode = 403;
      throw err;
    }

    return {
      id: record.id,
      originalName: record.originalName,
      storageName: record.storageName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      checksum: record.checksum,
      entityType: record.entityType,
      entityId: record.entityId,
      fieldName: record.fieldName,
      version: record.version,
      previewEnabled: record.previewEnabled,
      uploadedById: record.uploadedById,
      createdAt: record.createdAt,
      deletedAt: record.deletedAt,
    };
  }

  async softDelete(id: string, userId: string, roleName: string): Promise<void> {
    const record = await prisma.file.findUnique({ where: { id } });
    if (!record) {
      const err = new Error('File not found') as any;
      err.statusCode = 404;
      throw err;
    }
    if (record.deletedAt) {
      const err = new Error('File already deleted') as any;
      err.statusCode = 410;
      throw err;
    }

    const access = await this.checkAccess(id, userId, roleName);
    if (!access) {
      const err = new Error('Access denied') as any;
      err.statusCode = 403;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.file.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: userId },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'File',
          entityId: id,
          action: 'DELETE',
          userId,
          oldValue: JSON.stringify(record),
        },
      });

      if (SINGLE_FIELDS.includes(record.fieldName)) {
        await this.updateParentField(tx, record.entityType, record.entityId, record.fieldName, null);
      }
    });

    this.storage.delete(record.storageName).catch((err: Error) => {
      logError('Failed to delete physical file after soft-delete', {
        source: 'FileService.softDelete',
        metadata: { recordId: id, storageName: record.storageName, error: err.message },
      });
    });
  }

  async permanentDelete(id: string): Promise<void> {
    const record = await prisma.file.findUnique({ where: { id } });
    if (!record) {
      const err = new Error('File not found') as any;
      err.statusCode = 404;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await this.storage.delete(record.storageName);
      await tx.file.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          entityType: 'File',
          entityId: id,
          action: 'PERMANENT_DELETE',
          userId: 'system',
          oldValue: JSON.stringify(record),
        },
      });
    });
  }

  async list(entityType: string, entityId: string, fieldName?: string, options?: ListOptions): Promise<ListResult> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize || 20));

    const where: any = { entityType, entityId };
    if (fieldName) where.fieldName = fieldName;
    if (!options?.includeDeleted) where.deletedAt = null;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.file.count({ where }),
    ]);

    return {
      files: files.map(f => ({
        id: f.id,
        originalName: f.originalName,
        storageName: f.storageName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        checksum: f.checksum,
        entityType: f.entityType,
        entityId: f.entityId,
        fieldName: f.fieldName,
        version: f.version,
        previewEnabled: f.previewEnabled,
        uploadedById: f.uploadedById,
        createdAt: f.createdAt,
        deletedAt: f.deletedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async checkAccess(id: string, userId: string, roleName: string): Promise<boolean> {
    try {
      const record = await prisma.file.findUnique({ where: { id } });
      if (!record) return false;
      return this.checkEntityAccess(record.entityType, record.entityId, userId, roleName, record.uploadedById);
    } catch (err) {
      logError('checkAccess error', { stack: (err as Error).stack, source: 'FileService.checkAccess' });
      return false;
    }
  }

  async checkEntityAccess(entityType: string, entityId: string, userId: string, roleName: string, uploadedById?: string): Promise<boolean> {
    try {
      if (uploadedById === userId) return true;
      if (!roleName) return true;
      if (['Director', 'Owner'].includes(roleName)) return true;

      if (entityType === 'legal') {
        const doc = await prisma.legalDocument.findUnique({ where: { id: entityId } });
        return doc?.responsibleLawyerId === userId;
      }
      if (entityType === 'installation') {
        const task = await prisma.installationTask.findUnique({ where: { id: entityId } });
        return task?.installerId === userId;
      }
      if (entityType === 'deal') {
        const deal = await prisma.deal.findUnique({ where: { id: entityId } });
        return deal?.responsibleAgentId === userId;
      }
      return true;
    } catch (err) {
      logError('checkEntityAccess error', {
        stack: (err as Error).stack,
        source: 'FileService.checkEntityAccess',
        metadata: { entityType, entityId, userId, roleName },
      });
      return false;
    }
  }

  async cleanupExpiredDeletedFiles(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const expired = await prisma.file.findMany({
      where: { deletedAt: { lte: cutoff } },
    });

    for (const record of expired) {
      try {
        await this.permanentDelete(record.id);
      } catch (err) {
        logError('Failed to permanently delete expired file', {
          source: 'FileService.cleanupExpiredDeletedFiles',
          metadata: { recordId: record.id, error: (err as Error).message },
        });
      }
    }
    return expired.length;
  }

  async cleanupOrphanedFiles(): Promise<{ deletedRecords: number; deletedFiles: number }> {
    const records = await prisma.file.findMany();
    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const record of records) {
      if (!this.storage.exists(record.storageName)) {
        await prisma.file.delete({ where: { id: record.id } });
        deletedRecords++;
      }
    }

    const uploadsRoot = path.join(__dirname, '../../uploads');

    const walkDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'temp') continue;
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const exists = records.some(r => r.storageName === entry.name || this.storage.getFullPath(r.storageName) === fullPath);
          if (!exists) {
            fs.unlinkSync(fullPath);
            deletedFiles++;
          }
        }
      }
    };

    walkDir(uploadsRoot);
    return { deletedRecords, deletedFiles };
  }

  private async computeChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => {
        try { stream.destroy(); } catch { /* ignore */ }
        reject(err);
      });
    });
  }

  private async updateParentField(tx: any, entityType: string, entityId: string, fieldName: string, value: string | null) {
    const model = MODEL_MAP[entityType];
    if (!model) return;
    try {
      await tx[model].update({
        where: { id: entityId },
        data: { [fieldName]: value },
      });
    } catch (e: any) {
      logError('Failed to update parent field', {
        source: 'FileService.updateParentField',
        metadata: { entityType, entityId, fieldName, error: e.message },
      });
    }
  }

  private cleanupTemp(tempPath: string): void {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch { /* ignore */ }
  }
}
