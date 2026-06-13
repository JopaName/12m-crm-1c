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
    fs.renameSync(tempPath, targetPath);
    return "/uploads/" + targetDir + "/" + targetName;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
    const fullPath = path.join(UPLOADS_ROOT, fileUrl.replace("/uploads/", ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  getFullPath(fileUrl: string): string {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return fileUrl || "";
    return path.join(UPLOADS_ROOT, fileUrl.replace("/uploads/", ""));
  }

  async read(fileUrl: string): Promise<Buffer> {
    return fs.promises.readFile(this.getFullPath(fileUrl));
  }

  createReadStream(fileUrl: string): fs.ReadStream {
    return fs.createReadStream(this.getFullPath(fileUrl));
  }

  getFileSize(fileUrl: string): number {
    const fullPath = this.getFullPath(fileUrl);
    if (!fs.existsSync(fullPath)) return 0;
    return fs.statSync(fullPath).size;
  }
}
