import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { FileService } from "../services/FileService";

const prisma = new PrismaClient();
const tempDir = "/tmp/file-test-temp";

describe("FileService Integration", () => {
  let fileService: FileService;
  let testUserId: string;

  beforeAll(async () => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const admin = await prisma.user.findFirst({ where: { email: "director@12m.ru" } });
    if (!admin) throw new Error("No admin user found. Run seed first.");
    testUserId = admin.id;
    fileService = new FileService();
  });

  afterAll(async () => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  test("1. Upload a file from temp path", async () => {
    const tempFile = path.join(tempDir, "test-upload.txt");
    fs.writeFileSync(tempFile, "Hello, integration test!");
    const record = await fileService.uploadFromTemp(tempFile, "hello.txt", "text/plain", 22, "legal", "test-entity-id", "fileDraft", testUserId);
    expect(record).toBeDefined();
    expect(record.fileName).toBe("hello.txt");
    expect(record.fileUrl).toContain("/uploads/legal/test-entity-id/");
    expect(fs.existsSync(tempFile)).toBe(false);
    await fileService.delete(record.id, testUserId);
  });

  test("2. Reject oversized file", async () => {
    const tempFile = path.join(tempDir, "too-large.bin");
    const bigBuf = Buffer.alloc(60 * 1024 * 1024);
    fs.writeFileSync(tempFile, bigBuf);
    await expect(fileService.uploadFromTemp(tempFile, "big.bin", "application/octet-stream", 60 * 1024 * 1024, "legal", "eid", "fileDraft", testUserId)).rejects.toThrow(/too large/);
    expect(fs.existsSync(tempFile)).toBe(false);
  });

  test("3. Reject disallowed MIME type", async () => {
    const tempFile = path.join(tempDir, "evil.exe");
    fs.writeFileSync(tempFile, "fake exe content");
    await expect(fileService.uploadFromTemp(tempFile, "evil.exe", "application/x-msdownload", 100, "legal", "eid", "fileDraft", testUserId)).rejects.toThrow(/not allowed/);
    expect(fs.existsSync(tempFile)).toBe(false);
  });

  test("4. Reject content type mismatch", async () => {
    const tempFile = path.join(tempDir, "fake-pdf.txt");
    fs.writeFileSync(tempFile, "This is not a PDF at all");
    await expect(fileService.uploadFromTemp(tempFile, "fake.pdf", "application/pdf", 20, "legal", "eid", "fileDraft", testUserId)).rejects.toThrow(/content does not match/);
    expect(fs.existsSync(tempFile)).toBe(false);
  });

  test("5. List files with pagination", async () => {
    const tempFile = path.join(tempDir, "page-test.txt");
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(tempFile, "File " + i);
      const record = await fileService.uploadFromTemp(tempFile, "file-" + i + ".txt", "text/plain", 6, "legal", "paginated-entity", "notes", testUserId);
      ids.push(record.id);
    }
    const result = await fileService.list("legal", "paginated-entity", undefined, { page: 1, pageSize: 2 });
    expect(result.files.length).toBe(2);
    expect(result.total).toBe(5);
    for (const id of ids) await fileService.delete(id, testUserId);
  });

  test("6. Delete by entity (cascading)", async () => {
    const tempFile = path.join(tempDir, "cascade-test.txt");
    const entityId = "cascade-test-entity";
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(tempFile, "Cascade " + i);
      await fileService.uploadFromTemp(tempFile, "cascade-" + i + ".txt", "text/plain", 8, "service", entityId, "docs", testUserId);
    }
    const deletedCount = await fileService.deleteByEntity("service", entityId);
    expect(deletedCount).toBe(3);
    const remaining = await fileService.list("service", entityId);
    expect(remaining.total).toBe(0);
  });

  test("7. Download via stream", async () => {
    const tempFile = path.join(tempDir, "stream-test.txt");
    fs.writeFileSync(tempFile, "Stream me!");
    const record = await fileService.uploadFromTemp(tempFile, "stream-test.txt", "text/plain", 9, "legal", "stream-entity", "fileDraft", testUserId);
    const { stream } = await fileService.download(record.id);
    expect(stream).toBeDefined();
    expect(typeof stream.pipe).toBe("function");
    await fileService.delete(record.id, testUserId);
  });

  test("8. Content-Disposition header format", () => {
    const { getContentDisposition } = require("../utils/fileUtils");
    const result = getContentDisposition("image/png", "Тест.png");
    expect(result).toContain("inline;");
    expect(result).toContain("filename*=UTF-8''");
    expect(decodeURIComponent(result.match(/filename\*=(?:UTF-8'')?(%[0-9A-Fa-f]{2})+/)?.[0] || "")).toBeDefined();
  });

  test("9. checkEntityAccess allows access for unknown entity type", async () => {
    const result = await fileService.checkEntityAccess("nonexistent-type", "bad-id", "some-user", "SomeRole");
    expect(result).toBe(true);
  });

  test("10. Orphaned file cleanup", async () => {
    const tempFile = path.join(tempDir, "orphan-test.txt");
    fs.writeFileSync(tempFile, "Orphan me!");
    const record = await fileService.uploadFromTemp(tempFile, "orphan.txt", "text/plain", 10, "legal", "orphan-entity", "fileDraft", testUserId);
    const result = await fileService.cleanupOrphanedFiles();
    expect(result).toBeDefined();
    await fileService.delete(record.id, testUserId);
  });
});
