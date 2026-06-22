import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
// import Database from "better-sqlite3";

const DB_PATH = path.join(__dirname, "../..", "prisma", "dev.db");
const uploadDir = path.join(__dirname, "../..", "uploads", "knowledge");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

function getDb() {
  const db = new Database(DB_PATH);
  db.exec("CREATE TABLE IF NOT EXISTS KnowledgeDocument (id TEXT PRIMARY KEY, fileName TEXT, originalName TEXT, filePath TEXT, mimeType TEXT, fileSize INTEGER, category TEXT DEFAULT 'general', tags TEXT, source TEXT DEFAULT 'manual', employeeName TEXT, uploadedById TEXT, createdAt TEXT DEFAULT (datetime('now')))");
  return db;
}

function authByKey(req: any): string | null {
  const apiKey = req.query.api_key || req.headers["x-api-key"];
  if (!apiKey) return null;
  const db = getDb();
  const user = db.prepare("SELECT id FROM User WHERE apiKey = ? AND isActive = 1").get(apiKey);
  db.close();
  return user ? (user as any).id : null;
}

router.post("/upload", async (req: any, res: Response) => {
  const userId = authByKey(req);
  if (!userId) return res.status(401).json({ error: "Invalid API key. Use ?api_key=YOUR_KEY" });

  const handler = upload.single("file");
  handler(req, res, async (err: any) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file" });
    try {
      const { category, tags, employeeName } = req.body;
      const id = "kb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const db = getDb();
      db.prepare("INSERT INTO KnowledgeDocument (id, fileName, originalName, filePath, mimeType, fileSize, category, tags, source, employeeName, uploadedById) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
        id, req.file.filename, Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        "/uploads/knowledge/" + req.file.filename, req.file.mimetype, req.file.size,
        category || "general", tags || "", "agent", employeeName || "", userId
      );
      db.close();
      res.status(201).json({ ok: true, id, name: Buffer.from(req.file.originalname, "latin1").toString("utf8") });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
});

router.get("/", (req: any, res: Response) => {
  if (!authByKey(req)) return res.status(401).json({ error: "Invalid API key" });
  const db = getDb();
  const docs = db.prepare("SELECT k.*, u.firstName || ' ' || u.lastName as uploadedByName FROM KnowledgeDocument k LEFT JOIN User u ON k.uploadedById = u.id ORDER BY k.createdAt DESC LIMIT 100").all();
  db.close();
  res.json(docs);
});

router.get("/search", (req: any, res: Response) => {
  if (!authByKey(req)) return res.status(401).json({ error: "Invalid API key" });
  const q = "%" + (req.query.q || "") + "%";
  const db = getDb();
  const docs = db.prepare("SELECT k.* FROM KnowledgeDocument k WHERE k.originalName LIKE ? OR k.tags LIKE ? OR k.category LIKE ? OR k.employeeName LIKE ? ORDER BY k.createdAt DESC LIMIT 50").all(q, q, q, q);
  db.close();
  res.json(docs);
});

export default router;