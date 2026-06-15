import { ReadStream } from 'fs';

export interface StorageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IStorageProvider {
  save(storageName: string, file: StorageFile): Promise<void>;
  saveFromPath(storageName: string, tempPath: string): Promise<void>;
  read(storageName: string): Promise<Buffer>;
  createReadStream(storageName: string, start?: number, end?: number): ReadStream;
  delete(storageName: string): Promise<void>;
  getFullPath(storageName: string): string;
  getFileSize(storageName: string): number;
  exists(storageName: string): boolean;
}
