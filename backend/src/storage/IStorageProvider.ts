import fs from "fs";

export interface StorageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  save(file: StorageFile, subDir: string): Promise<StoredFile>;
  saveFromPath(tempPath: string, originalName: string, mimeType: string, fileSize: number, subDir: string): Promise<StoredFile>;
  move(tempPath: string, targetDir: string, targetName: string): string;
  delete(fileUrl: string): Promise<void>;
  getFullPath(fileUrl: string): string;
  createReadStream(fileUrl: string): fs.ReadStream;
  getFileSize(fileUrl: string): number;
  read(fileUrl: string): Promise<Buffer>;
}
