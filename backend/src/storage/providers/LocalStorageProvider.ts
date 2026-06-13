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
    return fs.readFileSync(this.getFullPath(fileUrl));
  }
}
