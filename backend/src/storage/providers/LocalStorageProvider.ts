import path from 'path';
import fs from 'fs';
import { IStorageProvider, StorageFile } from '../../interfaces/IStorageProvider';

const UPLOADS_ROOT = path.join(__dirname, '../../../uploads');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class LocalStorageProvider implements IStorageProvider {
  async save(storageName: string, file: StorageFile): Promise<void> {
    const fullPath = path.join(UPLOADS_ROOT, storageName);
    const dir = path.dirname(fullPath);
    ensureDir(dir);
    fs.writeFileSync(fullPath, file.buffer);
  }

  async saveFromPath(storageName: string, tempPath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_ROOT, storageName);
    const dir = path.dirname(fullPath);
    ensureDir(dir);
    try {
      fs.renameSync(tempPath, fullPath);
    } catch (err: any) {
      if (err.code === 'EXDEV') {
        fs.copyFileSync(tempPath, fullPath);
        try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
      } else {
        throw err;
      }
    }
  }

  async read(storageName: string): Promise<Buffer> {
    return fs.promises.readFile(this.getFullPath(storageName));
  }

  createReadStream(storageName: string, start?: number, end?: number): fs.ReadStream {
    const fullPath = this.getFullPath(storageName);
    if (!fs.existsSync(fullPath)) {
      const err = new Error('File not found on disk: ' + storageName) as any;
      err.statusCode = 404;
      throw err;
    }
    const options: any = { highWaterMark: 64 * 1024 };
    if (start !== undefined) options.start = start;
    if (end !== undefined) options.end = end;
    const stream = fs.createReadStream(fullPath, options);
    let destroyed = false;
    const timeoutId = setTimeout(() => {
      if (!destroyed) {
        destroyed = true;
        stream.destroy(new Error('Read stream timeout'));
      }
    }, 30000);
    stream.on('close', () => {
      clearTimeout(timeoutId);
      destroyed = true;
    });
    stream.on('error', (err: Error) => {
      if (!destroyed) {
        destroyed = true;
        stream.destroy(err);
      }
    });
    return stream;
  }

  async delete(storageName: string): Promise<void> {
    const fullPath = this.getFullPath(storageName);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err: any) {
      console.error('Failed to delete file:', fullPath, err.message);
    }
  }

  getFullPath(storageName: string): string {
    if (path.isAbsolute(storageName)) return storageName;
    return path.join(UPLOADS_ROOT, storageName);
  }

  getFileSize(storageName: string): number {
    const fullPath = this.getFullPath(storageName);
    if (!fs.existsSync(fullPath)) return 0;
    return fs.statSync(fullPath).size;
  }

  exists(storageName: string): boolean {
    return fs.existsSync(this.getFullPath(storageName));
  }
}
