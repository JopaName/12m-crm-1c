import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { prisma } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const uploadsDir = path.join(__dirname, "../../uploads/knowledge");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const orig = Buffer.from(file.originalname, "latin1").toString("utf8");
      const safe = orig.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]/g, "_");
      cb(null, Date.now() + "-" + safe);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

// ── Categories ──

router.get("/categories", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const cats = await prisma.knowledgeCategory.findMany({
    where: { isArchived: false },
    include: { _count: { select: { articles: true } } },
    orderBy: { sortOrder: "asc" },
  });
  res.json(cats);
}));

router.post("/categories", authMiddleware, requirePermission("knowledge:create"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, slug, description, icon, color, sortOrder, parentId } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const cat = await prisma.knowledgeCategory.create({
    data: { name, slug: slug || name.toLowerCase().replace(/[^a-zа-я0-9]+/g, "-"), description, icon: icon || "📁", color: color || "#6366f1", sortOrder: sortOrder || 0, parentId: parentId || null },
  });
  res.status(201).json(cat);
}));

router.put("/categories/:id", authMiddleware, requirePermission("knowledge:edit"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const cat = await prisma.knowledgeCategory.update({ where: { id: req.params.id }, data: req.body });
  res.json(cat);
}));

router.delete("/categories/:id", authMiddleware, requirePermission("knowledge:delete"), asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.knowledgeCategory.update({ where: { id: req.params.id }, data: { isArchived: true } });
  res.json({ success: true });
}));

// ── Articles ──

router.get("/articles", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { categoryId, search, page, limit } = req.query as any;
  const where: any = { isArchived: false };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { tags: { contains: search } },
    ];
  }
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 50;
  const [items, total] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * l,
      take: l,
    }),
    prisma.knowledgeArticle.count({ where }),
  ]);
  res.json({ items, total, page: p, limit: l });
}));

router.get("/articles/:id", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data: { viewCount: { increment: 1 } },
    include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.json(article);
}));

router.post("/articles", authMiddleware, requirePermission("knowledge:create"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, categoryId, tags, excerpt, isPublished } = req.body;
  if (!title || !content || !categoryId) return res.status(400).json({ error: "title, content, categoryId required" });
  const article = await prisma.knowledgeArticle.create({
    data: {
      title, content, categoryId, tags: tags || "",
      excerpt: excerpt || content.substring(0, 200),
      isPublished: isPublished ?? true,
      createdById: req.user!.id,
    },
    include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.status(201).json(article);
}));

router.put("/articles/:id", authMiddleware, requirePermission("knowledge:edit"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data: { ...req.body, updatedById: req.user!.id },
    include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.json(article);
}));

router.delete("/articles/:id", authMiddleware, requirePermission("knowledge:delete"), asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.knowledgeArticle.update({ where: { id: req.params.id }, data: { isArchived: true } });
  res.json({ success: true });
}));

router.get("/articles/:id/related", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const article = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id } });
  if (!article) return res.status(404).json({ error: "Not found" });
  const tags = (article.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const where: any = { id: { not: article.id }, isArchived: false };
  if (tags.length) where.tags = { contains: tags[0] };
  const related = await prisma.knowledgeArticle.findMany({
    where,
    include: { category: true },
    orderBy: { viewCount: "desc" },
    take: 6,
  });
  res.json(related);
}));

// ── Search ──

router.get("/search", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || "";
  if (!q.trim()) return res.json([]);
  const results = await prisma.knowledgeArticle.findMany({
    where: {
      isArchived: false, isPublished: true,
      OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }],
    },
    include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { viewCount: "desc" },
    take: 50,
  });
  res.json(results);
}));

// ── Article Files ──

router.get("/articles/:id/files", authMiddleware, requirePermission("knowledge:view"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = await prisma.file.findMany({
    where: { entityType: "KnowledgeArticle", entityId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ files });
}));

router.post("/articles/:id/files", authMiddleware, requirePermission("knowledge:create"), upload.single("file"), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const orig = Buffer.from(req.file.originalname, "latin1").toString("utf8");
  const record = await prisma.file.create({
    data: {
      originalName: orig,
      storageName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      checksum: null,
      entityType: "KnowledgeArticle",
      entityId: req.params.id,
      fieldName: "file",
      version: 1,
      uploadedById: req.user!.id,
    },
  });
  res.status(201).json(record);
}));

router.delete("/articles/:articleId/files/:fileId", authMiddleware, requirePermission("knowledge:delete"), asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findFirst({
    where: { id: req.params.fileId, entityType: "KnowledgeArticle", entityId: req.params.articleId },
  });
  if (!file) return res.status(404).json({ error: "File not found" });
  const fp = path.join(uploadsDir, file.storageName);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  await prisma.file.delete({ where: { id: req.params.fileId } });
  res.json({ success: true });
}));

export default router;
