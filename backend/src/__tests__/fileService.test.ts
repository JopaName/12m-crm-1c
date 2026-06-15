import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { FileService } from "../services/FileService";
import { FileValidatorService } from "../services/FileValidatorService";
import { LocalStorageProvider } from "../storage/providers/LocalStorageProvider";

const prisma = new PrismaClient();
const tempDir = "/tmp/file-test-temp";

describe("FileService Integration", () => {
  let fileService: FileService;
  let testUserId: string;
  let testFileId: string;

  beforeAll(async () => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const admin = await prisma.user.findFirst({ where: { email: "director@12m.ru" } });
    if (!admin) throw new Error("No admin user found. Run seed first.");
    testUserId = admin.id;
    fileService = new FileService();
    await prisma.file.deleteMany({});
  });

  afterAll(async () => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (testFileId) {
      try { await fileService.permanentDelete(testFileId); } catch { }
      testFileId = "";
    }
  });

  test("FileValidator: reject bad extension", () => {
    const validator = new FileValidatorService();
    const result = validator.validateExtension("evil.exe");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(415);
  });

  test("FileValidator: accept pdf extension", () => {
    const validator = new FileValidatorService();
    const result = validator.validateExtension("doc.pdf");
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("application/pdf");
  });

  test("FileValidator: reject oversized file", () => {
    const validator = new FileValidatorService();
    const result = validator.validateSize(60 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(413);
  });

  test("FileValidator: reject empty file", () => {
    const validator = new FileValidatorService();
    const result = validator.validateSize(0);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  test("FileValidator: accept valid size", () => {
    const validator = new FileValidatorService();
    const result = validator.validateSize(1024);
    expect(result.valid).toBe(true);
  });

  test("FileValidator: magic bytes match", () => {
    const f = path.join(tempDir, "magic-test.pdf");
    fs.writeFileSync(f, Buffer.from([0x25, 0x50, 0x44, 0x46]));
    const validator = new FileValidatorService();
    const result = validator.validateMagicBytes(f, "application/pdf");
    expect(result.valid).toBe(true);
    fs.unlinkSync(f);
  });

  test("FileValidator: magic bytes mismatch", () => {
    const f = path.join(tempDir, "fake-pdf.txt");
    fs.writeFileSync(f, "Not a PDF at all");
    const validator = new FileValidatorService();
    const result = validator.validateMagicBytes(f, "application/pdf");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(422);
    fs.unlinkSync(f);
  });

  test("LocalStorageProvider: save and read", async () => {
    const storage = new LocalStorageProvider();
    const name = crypto.randomUUID() + ".txt";
    await storage.save(name, { buffer: Buffer.from("hello"), originalName: "test.txt", mimeType: "text/plain", size: 5 });
    const data = await storage.read(name);
    expect(data.toString()).toBe("hello");
    await storage.delete(name);
    expect(storage.exists(name)).toBe(false);
  });

  test("Upload a valid text file", async () => {
    const f = path.join(tempDir, "upload-test.txt");
    fs.writeFileSync(f, "Hello, integration test!");
    const result = await fileService.upload(f, "hello.txt", "text/plain", 22, "legal", "test-entity-id", "fileDraft", testUserId);
    expect(result).toBeDefined();
    expect(result.originalName).toBe("hello.txt");
    expect(fs.existsSync(f)).toBe(false);
    testFileId = result.id;
  });

  test("Download file", async () => {
    const f = path.join(tempDir, "download-test.txt");
    fs.writeFileSync(f, "Download me!");
    const result = await fileService.upload(f, "download.txt", "text/plain", 11, "legal", "download-entity", "fileDraft", testUserId);
    testFileId = result.id;
    const { stream, record } = await fileService.download(result.id, testUserId, "Director");
    expect(stream).toBeDefined();
    expect(record.originalName).toBe("download.txt");
    expect(record.mimeType).toBe("text/plain");
  });

  test("Download deleted file returns 410", async () => {
    const f = path.join(tempDir, "deleted-test.txt");
    fs.writeFileSync(f, "Delete me");
    const result = await fileService.upload(f, "del.txt", "text/plain", 9, "legal", "del-entity", "fileDraft", testUserId);
    await fileService.softDelete(result.id, testUserId, "Director");
    await expect(fileService.download(result.id, testUserId, "Director")).rejects.toHaveProperty("statusCode", 410);
  });

  test("Download non-existent file returns 404", async () => {
    await expect(fileService.download("nonexistent-id", testUserId, "Director")).rejects.toHaveProperty("statusCode", 404);
  });

  test("Preview blocks unsafe type", async () => {
    const f = path.join(tempDir, "unsafe.html");
    fs.writeFileSync(f, "<html>bad</html>");
    const storage = fileService.getStorage();
    const name = crypto.randomUUID() + ".html";
    await storage.save(name, { buffer: fs.readFileSync(f), originalName: "bad.html", mimeType: "text/html", size: 15 });
    const db = await prisma.file.create({
      data: { originalName: "bad.html", storageName: name, mimeType: "text/html", sizeBytes: 15, checksum: "x", entityType: "legal", entityId: "test", fieldName: "fileDraft", uploadedById: testUserId },
    });
    await expect(fileService.preview(db.id, testUserId, "Director")).rejects.toHaveProperty("statusCode", 415);
    await storage.delete(name);
    await prisma.file.delete({ where: { id: db.id } });
  });

  test("List files with pagination", async () => {
    const f = path.join(tempDir, "list-test.txt");
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(f, "File " + i);
      const r = await fileService.upload(f, "f" + i + ".txt", "text/plain", 6, "legal", "list-entity", "notes", testUserId);
      testFileId = r.id;
    }
    const result = await fileService.list("legal", "list-entity", undefined, { page: 1, pageSize: 2 });
    expect(result.files.length).toBe(2);
    expect(result.total).toBe(3);
  });

  test("Soft delete and verify", async () => {
    const f = path.join(tempDir, "soft-del.txt");
    fs.writeFileSync(f, "Soft delete me");
    const result = await fileService.upload(f, "soft.txt", "text/plain", 13, "legal", "soft-entity", "fileDraft", testUserId);
    await fileService.softDelete(result.id, testUserId, "Director");
    const list = await fileService.list("legal", "soft-entity");
    expect(list.total).toBe(0);
    const listWithDeleted = await fileService.list("legal", "soft-entity", undefined, { includeDeleted: true });
    expect(listWithDeleted.total).toBe(1);
  });

  test("getMeta returns file metadata", async () => {
    const f = path.join(tempDir, "meta-test.txt");
    fs.writeFileSync(f, "Meta data");
    const result = await fileService.upload(f, "meta.txt", "text/plain", 9, "legal", "meta-entity", "fileDraft", testUserId);
    testFileId = result.id;
    const meta = await fileService.getMeta(result.id, testUserId, "Director");
    expect(meta.originalName).toBe("meta.txt");
    expect(meta.sizeBytes).toBe(9);
    expect(meta.checksum).toBeDefined();
    expect(meta.checksum.length).toBe(64);
  });
});
