import { Router, Response } from "express";
import { callAI, ChatMessage } from "../ai/openCodeClient";
import { prisma } from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { executeTool } from "../ai/toolExecutor";
import { ALL_TOOLS } from "../ai/tools";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const PROD_SEL = { id: true, productName: true, quantity: true, unit: true, category: { select: { name: true } } };
const CLIENT_SEL = { id: true, name: true, phone: true, email: true, inn: true, status: true };
const DEAL_SEL = { id: true, dealNumber: true, status: true, expectedAmount: true, client: { select: { name: true } } };
const TASK_SEL = { id: true, title: true, status: true, assignee: { select: { firstName: true } } };
const USER_SEL = { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true } }, isActive: true, apiKey: true };

async function getAllCrmData() {
  const [products, clients, deals, tasks, users] = await Promise.all([
    prisma.warehouseStockItem.findMany({ select: PROD_SEL, take: 10 }),
    prisma.client.findMany({ select: CLIENT_SEL, take: 5 }),
    prisma.deal.findMany({ select: DEAL_SEL, take: 5 }),
    prisma.task.findMany({ select: TASK_SEL, take: 5 }),
    prisma.user.findMany({ select: USER_SEL, take: 5, where: { isArchived: false } }),
  ]);
  const knowledgeDocs: any[] = [];
  return { products, clients, deals, tasks, users: users.map((u: any) => ({ ...u, apiKey: undefined })), knowledgeBase: knowledgeDocs };
}

function formatCrmContext(data: any): string {
  let s = "";
  if (data.products?.length) { s += "Sklad (" + data.products.length + "):\n"; data.products.forEach((p: any) => { s += "  " + p.productName + ": " + p.quantity + " " + p.unit + (p.category?.name ? " [" + p.category.name + "]" : "") + "\n"; }); }
  if (data.clients?.length) { s += "Klienty (" + data.clients.length + "):\n"; data.clients.forEach((c: any) => { s += "  " + c.name + " (" + (c.status || "-") + ")" + (c.inn ? " INN:" + c.inn : "") + "\n"; }); }
  if (data.deals?.length) { s += "Sdelki (" + data.deals.length + "):\n"; data.deals.forEach((d: any) => { s += "  " + d.dealNumber + ": " + d.status + " (" + (d.expectedAmount?.toLocaleString() || "0") + " RUB)" + (d.client?.name ? " [" + d.client.name + "]" : "") + "\n"; }); }
  if (data.tasks?.length) { s += "Zadachi (" + data.tasks.length + "):\n"; data.tasks.forEach((t: any) => { s += "  " + t.title + ": " + t.status + (t.assignee ? " -> " + t.assignee.firstName : "") + "\n"; }); }
  if (data.users?.length) { s += "Polzovateli (" + data.users.length + "):\n"; data.users.forEach((u: any) => { s += "  " + u.firstName + " " + u.lastName + " (" + u.email + ", " + u.role?.name + ")" + (u.isActive ? "" : " archived") + "\n"; }); }
  return s;
}

const TOOLS_LIST = ALL_TOOLS.map((t: any) => {
  const fn = t.function;
  const params = Object.entries(fn.parameters.properties || {}).map(([k, v]: any) => k + (fn.parameters.required?.includes(k) ? "" : "?")).join(", ");
  return fn.name + "(" + params + ") - " + fn.description;
}).join("\n");

// ---- SESSION ENDPOINTS ----
router.get("/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.aiChatSession.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true, files: true } } },
    });
    res.json(sessions);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.aiChatSession.create({ data: { userId: req.user!.id, title: req.body.title || "New chat" } });
    res.json(session);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/sessions/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.aiChatSession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.aiChatSession.update({ where: { id: session.id }, data: { title: req.body.title } });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/sessions/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.aiChatSession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: "Not found" });
    await prisma.aiChatMessage.deleteMany({ where: { sessionId: session.id } });
    await prisma.aiChatFile.deleteMany({ where: { sessionId: session.id } });
    await prisma.aiChatSession.delete({ where: { id: session.id } });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/sessions/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.aiChatSession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: "Not found" });
    const messages = await prisma.aiChatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } });
    res.json(messages);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/sessions/:id/files", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.aiChatSession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: "Not found" });
    const files = await prisma.aiChatFile.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" } });
    res.json(files);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ---- FILE UPLOAD ----
router.post("/upload", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file" });
    let sessionId = req.body.sessionId;
    if (!sessionId) {
      const session = await prisma.aiChatSession.create({ data: { userId: req.user!.id, title: "File: " + file.originalname } });
      sessionId = session.id;
    }
    const session = await prisma.aiChatSession.findFirst({ where: { id: sessionId, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    let extractedText: string | null = null;
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".txt" || ext === ".csv" || ext === ".json" || ext === ".md" || ext === ".xml" || ext === ".html") {
        extractedText = fs.readFileSync(file.path, "utf-8").substring(0, 50000);
      } else if (ext === ".pdf") {
        extractedText = "[PDF: " + file.originalname + " - text extraction requires pdf-parse]";
      } else {
        extractedText = "[File: " + file.originalname + " (" + file.mimetype + ", " + file.size + " bytes)]";
      }
    } catch { extractedText = "[Could not read " + file.originalname + "]"; }

    const stored = await prisma.aiChatFile.create({
      data: { sessionId: session.id, userId: req.user!.id, originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size, extractedText },
    });
    res.json({ ok: true, fileId: stored.id, sessionId: session.id, fileName: file.originalname, extractedLength: extractedText?.length || 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ---- COORDINATOR ----
router.post("/coordinator", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const u = req.user!;
    const { sessionId, content: msgContent } = req.body;
    const apiKey = u.apiKey || undefined;
    const isAdmin = u.roleName === "Administrator" || u.roleName === "Director";

    let session = null;
    if (sessionId) session = await prisma.aiChatSession.findFirst({ where: { id: sessionId, userId: u.id } });
    if (!session) session = await prisma.aiChatSession.create({ data: { userId: u.id, title: msgContent?.substring(0, 50) || "Chat" } });

    await prisma.aiChatMessage.create({ data: { sessionId: session.id, role: "user", content: msgContent || "" } });

    const history = await prisma.aiChatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" }, take: 15 });

    const crmData = await getAllCrmData();
    const crmSummary = formatCrmContext(crmData);

    const systemMsg =
      "Ty - intellektualnyj assistent CRM kompanii 12m (solnechnye paneli).\n" +
      "Polzovatel: " + u.firstName + " " + u.lastName + " (" + u.roleName + ")\n" +
      "Admin: " + isAdmin + "\n\n" +
      "Tekushchie dannye CRM:\n" + crmSummary + "\n" +
      "Dostupnye instrumenty:\n" + TOOLS_LIST + "\n\n" +
      "Pravila:\n" +
      "- Ty mozhesh DELAT VSE, chto mozhet polzovatel po svoej roli.\n" +
      "- Esli polzovatel chto-to prosit - sdelay eto cherez instrument.\n" +
      "- Dlya vyzova instrumenta verni JSON: {\"tool\":\"imya\",\"arguments\":{...}}\n" +
      "- Tolko ODIN instrument za raz. Posle rezultata sdelay kratkij vyvod.\n" +
      "- Esli net prav ili dannyh - skazhi ob etom, ne pridumyvaj.\n" +
      "- Otvechaj kratko, po delu, professionalno, na russkom yazyke.";

    const aiMessages: ChatMessage[] = [
      { role: "system", content: systemMsg },
      ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    let aiResponse = await callAI(aiMessages, apiKey, 0.3, 500);
    let finalResponse = "";
    let maxIterations = 5;

    while (maxIterations > 0) {
      maxIterations--;
      const cleaned = aiResponse.replace(/```json|```/g, "").trim();
      let parsed: any = {};
      let isTool = false;
      try {
        parsed = JSON.parse(cleaned);
        if (parsed.tool) isTool = true;
      } catch (e) {}

      if (isTool && parsed.tool) {
        const result = await executeTool(parsed.tool, parsed.arguments || {}, { id: u.id, email: u.email, roleName: u.roleName, firstName: u.firstName, lastName: u.lastName }, isAdmin);
        aiMessages.push({ role: "assistant", content: JSON.stringify({ tool: parsed.tool, args: parsed.arguments }) });
        aiMessages.push({ role: "user", content: "Result: " + (result.ok ? JSON.stringify(result.data || result.msg) : "Error: " + result.msg) });
        aiResponse = await callAI(aiMessages, apiKey, 0.3, 500);
      } else {
        finalResponse = cleaned || "Gotov pomoch.";
        break;
      }
    }

    if (!finalResponse) finalResponse = aiResponse.replace(/```json|```/g, "").trim() || "Gotov pomoch.";

    await prisma.aiChatMessage.create({ data: { sessionId: session.id, role: "assistant", content: finalResponse } });
    if (session.title === "Chat" && msgContent) {
      await prisma.aiChatSession.update({ where: { id: session.id }, data: { title: msgContent.substring(0, 50) } });
    }

    res.json({ response: finalResponse, sessionId: session.id });
  } catch (err: any) {
    console.error("Coordinator error:", err);
    res.status(500).json({ response: "Oshibka: " + (err.message || "Internal error") });
  }
});

export default router;
