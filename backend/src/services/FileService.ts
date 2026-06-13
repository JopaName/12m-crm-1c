import { prisma } from "../db";
import { IStorageProvider } from "../storage/IStorageProvider";
import { LocalStorageProvider } from "../storage/providers/LocalStorageProvider";
import { sanitizeFilename, isAllowedMimeType, formatFileSize, FILE_LIMITS, validateFileContent } from "../utils/fileUtils";
import { logError } from "../utils/logger";
import path from "path";
import fs from "fs";

const SINGLE_FIELDS = ["fileDraft", "fileSigned", "photoBefore", "photoAfter", "clientSignature"];

const MODEL_MAP: Record<string, string> = {
  legal: "legalDocument",
  telemetry: "telemetryReading",
  installation: "installationTask",
  deal: "deal",
  service: "serviceCase",
};

interface ListOptions {
  page?: number;
  pageSize?: number;
}

interface ListResult {
  files: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class FileService {
  private storage: IStorageProvider;

  constructor(storage?: IStorageProvider) {
    this.storage = storage || new LocalStorageProvider();
  }

  async uploadFromTemp(
    tempPath: string,
    originalName: string,
    declaredMime: string,
    fileSize: number,
    entityType: string,
    entityId: string,
    fieldName: string,
    userId: string,
  ) {
    if (fileSize > FILE_LIMITS.maxSizeBytes) {
      this.cleanupTemp(tempPath);
      throw Object.assign(new Error("File too large (max " + formatFileSize(FILE_LIMITS.maxSizeBytes) + ")"), { statusCode: 413 });
    }
    if (!isAllowedMimeType(declaredMime)) {
      this.cleanupTemp(tempPath);
      throw Object.assign(new Error("File type " + declaredMime + " is not allowed"), { statusCode: 400 });
    }
    if (!validateFileContent(tempPath, declaredMime)) {
      this.cleanupTemp(tempPath);
      throw Object.assign(new Error("File content does not match declared type " + declaredMime), { statusCode: 400 });
    }

    return prisma.$transaction(async (tx) => {
      const existingCount = await tx.fileRecord.count({ where: { entityType, entityId, fieldName } });
      if (existingCount >= FILE_LIMITS.maxFilesPerEntity) {
        this.cleanupTemp(tempPath);
        throw Object.assign(new Error("Max " + FILE_LIMITS.maxFilesPerEntity + " files per entity"), { statusCode: 400 });
      }

      if (SINGLE_FIELDS.includes(fieldName)) {
        const old = await tx.fileRecord.findFirst({ where: { entityType, entityId, fieldName } });
        if (old) {
          await this.storage.delete(old.fileUrl);
          await tx.fileRecord.delete({ where: { id: old.id } });
        }
      }

      const ext = path.extname(originalName) || "";
      const baseName = path.basename(originalName, ext)
        .replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_")
        .slice(0, 100);
      const timestamp = Date.now();
      const uniqueName = timestamp + "-" + baseName + ext;
      const subDir = entityType + "/" + entityId;

      const fileUrl = this.storage.move(tempPath, subDir, uniqueName);

      const record = await tx.fileRecord.create({
        data: {
          entityType, entityId, fieldName,
          fileName: sanitizeFilename(originalName),
          fileUrl, fileSize, mimeType: declaredMime,
          uploadedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "File", entityId: record.id, action: "UPLOAD", userId,
          newValue: JSON.stringify({ entityType, entityId, fieldName, fileName: sanitizeFilename(originalName), fileSize, mimeType: declaredMime }),
        },
      });

      if (SINGLE_FIELDS.includes(fieldName)) {
        await this.updateParentField(tx, entityType, entityId, fieldName, fileUrl);
      }

      return record;
    });
  }

  async download(recordId: string) {
    const record = await prisma.fileRecord.findUnique({ where: { id: recordId } });
    if (!record) throw Object.assign(new Error("File not found"), { statusCode: 404 });
    const stream = this.storage.createReadStream(record.fileUrl);
    return { stream, record };
  }

  async downloadByField(entityType: string, entityId: string, fieldName: string) {
    const record = await prisma.fileRecord.findFirst({ where: { entityType, entityId, fieldName } });
    if (!record) throw Object.assign(new Error("File not found"), { statusCode: 404 });
    const stream = this.storage.createReadStream(record.fileUrl);
    return { stream, record };
  }

  async delete(recordId: string, userId: string) {
    const record = await prisma.fileRecord.findUnique({ where: { id: recordId } });
    if (!record) throw Object.assign(new Error("File not found"), { statusCode: 404 });
    await this.storage.delete(record.fileUrl);
    await prisma.fileRecord.delete({ where: { id: recordId } });

    await prisma.auditLog.create({
      data: {
        entityType: "File", entityId: recordId, action: "DELETE", userId,
        oldValue: JSON.stringify(record),
      },
    });

    if (SINGLE_FIELDS.includes(record.fieldName)) {
      await this.updateParentField(prisma, record.entityType, record.entityId, record.fieldName, null);
    }
  }

  async deleteByEntity(entityType: string, entityId: string): Promise<number> {
    const records = await prisma.fileRecord.findMany({ where: { entityType, entityId } });
    for (const record of records) {
      await this.storage.delete(record.fileUrl);
    }
    const result = await prisma.fileRecord.deleteMany({ where: { entityType, entityId } });
    return result.count;
  }

  async list(entityType: string, entityId: string, fieldName?: string, options?: ListOptions): Promise<ListResult> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.min(FILE_LIMITS.maxPageSize, Math.max(1, options?.pageSize || FILE_LIMITS.defaultPageSize));

    const where: any = { entityType, entityId };
    if (fieldName) where.fieldName = fieldName;

    const [files, total] = await Promise.all([
      prisma.fileRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.fileRecord.count({ where }),
    ]);

    return { files, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async checkAccess(recordId: string, userId: string, roleName: string): Promise<boolean> {
    try {
      const record = await prisma.fileRecord.findUnique({ where: { id: recordId } });
      if (!record) return false;
      return this.checkEntityAccess(record.entityType, record.entityId, userId, roleName, record.uploadedById);
    } catch (err) {
      logError("checkAccess error", { stack: (err as Error).stack, source: "FileService.checkAccess" });
      return false;
    }
  }

  async checkEntityAccess(entityType: string, entityId: string, userId: string, roleName: string, uploadedById?: string): Promise<boolean> {
    try {
      if (["Director", "Owner"].includes(roleName)) return true;
      if (uploadedById === userId) return true;

      if (entityType === "legal") {
        const doc = await prisma.legalDocument.findUnique({ where: { id: entityId } });
        return doc?.responsibleLawyerId === userId;
      }
      if (entityType === "installation") {
        const task = await prisma.installationTask.findUnique({ where: { id: entityId } });
        return task?.installerId === userId;
      }
      if (entityType === "deal") {
        const deal = await prisma.deal.findUnique({ where: { id: entityId } });
        return deal?.responsibleAgentId === userId;
      }
      return true;
    } catch (err) {
      logError("checkEntityAccess error", {
        stack: (err as Error).stack,
        source: "FileService.checkEntityAccess",
        metadata: { entityType, entityId, userId, roleName },
      });
      return false;
    }
  }

  async cleanupOrphanedFiles(): Promise<{ deletedRecords: number; deletedFiles: number }> {
    const records = await prisma.fileRecord.findMany();
    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const record of records) {
      const fullPath = this.storage.getFullPath(record.fileUrl);
      if (!fs.existsSync(fullPath)) {
        await prisma.fileRecord.delete({ where: { id: record.id } });
        deletedRecords++;
      }
    }

    const uploadsRoot = path.join(__dirname, "../../uploads");

    function walkDir(dir: string, relativeBase: string): void {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "temp") continue;
          walkDir(fullPath, relativeBase + "/" + entry.name);
        } else if (entry.isFile()) {
          const fileUrl = "/uploads" + relativeBase + "/" + entry.name;
          const exists = records.some(r => r.fileUrl === fileUrl);
          if (!exists) {
            fs.unlinkSync(fullPath);
            deletedFiles++;
          }
        }
      }
    }

    walkDir(uploadsRoot, "");
    return { deletedRecords, deletedFiles };
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
      logError("Failed to update parent field", {
        source: "FileService.updateParentField",
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
