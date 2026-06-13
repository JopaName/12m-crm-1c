import { prisma } from "../db";
import { IStorageProvider, StorageFile } from "../storage/IStorageProvider";
import { LocalStorageProvider } from "../storage/providers/LocalStorageProvider";
import { sanitizeFilename, isAllowedMimeType, formatFileSize } from "../utils/fileUtils";

const FILE_LIMITS = {
  maxSizeBytes: 50 * 1024 * 1024,
  maxFilesPerEntity: 20,
};

const SINGLE_FIELDS = ["fileDraft", "fileSigned", "photoBefore", "photoAfter", "clientSignature"];

const MODEL_MAP: Record<string, string> = {
  legal: "legalDocument",
  telemetry: "telemetryReading",
  installation: "installationTask",
  deal: "deal",
  service: "serviceCase",
};

export class FileService {
  private storage: IStorageProvider;

  constructor(storage?: IStorageProvider) {
    this.storage = storage || new LocalStorageProvider();
  }

  async upload(file: StorageFile, entityType: string, entityId: string, fieldName: string, userId: string) {
    if (file.size > FILE_LIMITS.maxSizeBytes) {
      throw Object.assign(new Error("File too large (max " + formatFileSize(FILE_LIMITS.maxSizeBytes) + ")"), { statusCode: 400 });
    }
    if (!isAllowedMimeType(file.mimeType)) {
      throw Object.assign(new Error("File type " + file.mimeType + " is not allowed"), { statusCode: 400 });
    }

    const existingCount = await prisma.fileRecord.count({ where: { entityType, entityId, fieldName } });
    if (existingCount >= FILE_LIMITS.maxFilesPerEntity) {
      throw Object.assign(new Error("Max " + FILE_LIMITS.maxFilesPerEntity + " files per entity"), { statusCode: 400 });
    }

    if (SINGLE_FIELDS.includes(fieldName)) {
      const old = await prisma.fileRecord.findFirst({ where: { entityType, entityId, fieldName } });
      if (old) {
        await this.storage.delete(old.fileUrl);
        await prisma.fileRecord.delete({ where: { id: old.id } });
      }
    }

    const subDir = entityType + "/" + entityId;
    const stored = await this.storage.save(file, subDir);

    const record = await prisma.fileRecord.create({
      data: {
        entityType, entityId, fieldName,
        fileName: sanitizeFilename(file.originalName),
        fileUrl: stored.fileUrl,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        uploadedById: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "File", entityId: record.id, action: "UPLOAD", userId,
        newValue: JSON.stringify({ entityType, entityId, fieldName, fileName: sanitizeFilename(file.originalName), fileSize: stored.fileSize, mimeType: stored.mimeType }),
      },
    });

    if (SINGLE_FIELDS.includes(fieldName)) {
      await this.updateParentField(entityType, entityId, fieldName, record.fileUrl);
    }
    return record;
  }

  async download(recordId: string) {
    const record = await prisma.fileRecord.findUnique({ where: { id: recordId } });
    if (!record) throw Object.assign(new Error("File not found"), { statusCode: 404 });
    const buffer = await this.storage.read(record.fileUrl);
    return { buffer, record };
  }

  async downloadByField(entityType: string, entityId: string, fieldName: string) {
    const record = await prisma.fileRecord.findFirst({ where: { entityType, entityId, fieldName } });
    if (!record) throw Object.assign(new Error("File not found"), { statusCode: 404 });
    const buffer = await this.storage.read(record.fileUrl);
    return { buffer, record };
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
      await this.updateParentField(record.entityType, record.entityId, record.fieldName, null);
    }
  }

  async list(entityType: string, entityId: string, fieldName?: string) {
    const where: any = { entityType, entityId };
    if (fieldName) where.fieldName = fieldName;
    return prisma.fileRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      //include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async checkAccess(recordId: string, userId: string, roleName: string): Promise<boolean> {
    const record = await prisma.fileRecord.findUnique({ where: { id: recordId } });
    if (!record) return false;
    return this.checkEntityAccess(record.entityType, record.entityId, userId, roleName, record.uploadedById);
  }

  async checkEntityAccess(entityType: string, entityId: string, userId: string, roleName: string, uploadedById?: string): Promise<boolean> {
    if (["Director", "Owner"].includes(roleName)) return true;
    if (uploadedById === userId) return true;

    try {
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
    } catch { return false; }
  }

  private async updateParentField(entityType: string, entityId: string, fieldName: string, value: string | null) {
    try {
      const model = MODEL_MAP[entityType];
      if (!model) return;
      await (prisma as any)[model].update({
        where: { id: entityId },
        data: { [fieldName]: value },
      });
    } catch (e) {
      console.error("Failed to update parent field", entityType, entityId, fieldName, e);
    }
  }
}
