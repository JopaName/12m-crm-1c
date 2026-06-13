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
  delete(fileUrl: string): Promise<void>;
  getFullPath(fileUrl: string): string;
  read(fileUrl: string): Promise<Buffer>;
}
