import { ReadStream } from 'fs';

export interface UploadResult {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  version: number;
  createdAt: Date;
}

export interface DownloadResult {
  stream: ReadStream;
  record: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    entityType: string;
    entityId: string;
    previewEnabled: boolean;
    deletedAt: Date | null;
  };
  fileSize: number;
}

export interface PreviewResult {
  stream: ReadStream;
  mimeType: string;
  sizeBytes: number;
  disposition: 'inline' | 'attachment';
}

export interface FileMeta {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  version: number;
  previewEnabled: boolean;
  uploadedById: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface ListResult {
  files: FileMeta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IFileService {
  upload(tempPath: string, originalName: string, declaredMime: string, fileSize: number, entityType: string, entityId: string, fieldName: string, userId: string): Promise<UploadResult>;
  download(id: string, userId: string, roleName: string): Promise<DownloadResult>;
  preview(id: string, userId: string, roleName: string, range?: string): Promise<PreviewResult>;
  getMeta(id: string, userId: string, roleName: string): Promise<FileMeta>;
  softDelete(id: string, userId: string, roleName: string): Promise<void>;
  permanentDelete(id: string): Promise<void>;
  list(entityType: string, entityId: string, fieldName?: string, options?: ListOptions): Promise<ListResult>;
  checkAccess(id: string, userId: string, roleName: string): Promise<boolean>;
  cleanupExpiredDeletedFiles(olderThanDays?: number): Promise<number>;
  cleanupOrphanedFiles(): Promise<{ deletedRecords: number; deletedFiles: number }>;
}
