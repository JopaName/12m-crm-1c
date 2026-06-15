import path from "path";
import fs from "fs";
import { IStorageProvider, StorageFile, StoredFile } from "../IStorageProvider";

const UPLOADS_ROOT = path.join(__dirname, "../../../uploads");

export class LocalStorageProvider implements IStorageProvider {
  async save(file: StorageFile, subDir: string): Promise<StoredFile> {
    const dir = path.join(UPLOADS_ROOT, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalName) || "";
    const baseName = path.basename(file.originalName, ext)
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_")
      .slice(0, 100);
    const timestamp = Date.now();
    const uniqueName = timestamp + "-" + baseName + ext;
    const fullPath = path.join(dir, uniqueName);
    const relativeUrl = "/uploads/" + subDir + "/" + uniqueName;

    fs.writeFileSync(fullPath, file.buffer);
    return { fileUrl: relativeUrl, fileSize: file.size, mimeType: file.mimeType };
  }

  async saveFromPath(tempPath: string, originalName: string, mimeType: string, fileSize: number, subDir: string): Promise<StoredFile> {
    const targetDir = path.join(UPLOADS_ROOT, subDir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(originalName) || "";
    const baseName = path.basename(originalName, ext)
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_")
      .slice(0, 100);
    const timestamp = Date.now();
    const uniqueName = timestamp + "-" + baseName + ext;
    const targetPath = path.join(targetDir, uniqueName);
    const relativeUrl = "/uploads/" + subDir + "/" + uniqueName;

    fs.renameSync(tempPath, targetPath);
    return { fileUrl: relativeUrl, fileSize, mimeType };
  }

  move(tempPath: string, targetDir: string, targetName: string): string {
    const absTargetDir = path.join(UPLOADS_ROOT, targetDir);
    if (!fs.existsSync(absTargetDir)) fs.mkdirSync(absTargetDir, { recursive: true });
    const targetPath = path.join(absTargetDir, targetName);
    try {
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      // Cross-device link fallback: copy + unlink
      fs.copyFileSync(tempPath, targetPath);
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
    return "/uploads/" + targetDir + "/" + targetName;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
    const fullPath = path.join(UPLOADS_ROOT, fileUrl.replace("/uploads/", ""));
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error("Failed to delete file:", fullPath, (err as Error).message);
    }
  }

  getFullPath(fileUrl: string): string {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return fileUrl || "";
    return path.join(UPLOADS_ROOT, fileUrl.replace("/uploads/", ""));
  }

  async read(fileUrl: string): Promise<Buffer> {
    return fs.promises.readFile(this.getFullPath(fileUrl));
  }

  createReadStream(fileUrl: string, start?: number, end?: number): fs.ReadStream {
    var fullPath = this.getFullPath(fileUrl);
    if (!fs.existsSync(fullPath)) {
      var err = new Error("File not found on disk: " + fileUrl);
      (err as any).statusCode = 404;
      throw err;
    }
    var options: any = { highWaterMark: 64 * 1024 };
    if (start !== undefined) options.start = start;
    if (end !== undefined) options.end = end;
    var stream = fs.createReadStream(fullPath, options);

    var destroyed = false;
    stream.on("error", function(err: Error) {
      if (!destroyed) {
        destroyed = true;
        stream.destroy();
      }
    });

    var timeoutId = setTimeout(function() {
      if (!destroyed) {
        destroyed = true;
        stream.destroy(new Error("Read stream timeout"));
      }
    }, 30000);

    stream.on("close", function() {
      clearTimeout(timeoutId);
      if (!destroyed) {
        destroyed = true;
      }
    });

    return stream;
  }



  getFileSize(fileUrl: string): number {
    const fullPath = this.getFullPath(fileUrl);
    if (!fs.existsSync(fullPath)) return 0;
    return fs.statSync(fullPath).size;
  }
}
