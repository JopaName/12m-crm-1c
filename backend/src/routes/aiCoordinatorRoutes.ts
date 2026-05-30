import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { callAI, detectIntent, ChatMessage } from "../ai/openCodeClient";

const router = Router();
const prisma = new PrismaClient();

// Minimal select maps for token efficiency
const CLIENT_SELECT = { id: true, name: true, phone: true, email: true, inn: true, status: true };
const DEAL_SELECT = { id: true, dealNumber: true, status: true, expectedAmount: true, client: { select: { name: true } } };
const TASK_SELECT = { id: true, title: true, status: true, dueDate: true, assignee: { select: { firstName: true, lastName: true } } };
const PRODUCT_SELECT = { id: true, productName: true, sku: true, quantity: true, unit: true, category: { select: { name: true } } };

router.post("/coordinator", async (req, res) => {
  try {
    const { messages, userId }: { messages: ChatMessage[]; userId: string } = req.body;
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Step 1: Detect Intent
    const intentResult = await detectIntent(lastMessage);

    if (intentResult.intent === "CHAT") {
      // Standard chat response
      const systemPrompt = `You are an AI Coordinator for 12M CRM (solar panels manufacturing).
Be concise, professional, and helpful. No fluff.`;
      const response = await callAI([
        { role: "system", content: systemPrompt },
        ...messages.slice(-5),
      ]);
      return res.json({ intent: "CHAT", response });
    }

    if (intentResult.intent === "SEARCH") {
      // Step 2: Execute Prisma query based on entities
      const entities = intentResult.entities || {};
      let searchData: any = null;

      if (entities.client || entities.inn) {
        const clients = await prisma.client.findMany({
          where: {
            OR: [
              { name: { contains: entities.client || "", mode: "insensitive" } },
              { inn: entities.inn || "" },
              { phone: { contains: entities.client || "" } },
            ],
          },
          select: CLIENT_SELECT,
          take: 3,
        });
        searchData = { type: "clients", data: clients };
      } else if (entities.deal || entities.dealNumber) {
        const deals = await prisma.deal.findMany({
          where: {
            OR: [
              { dealNumber: { contains: entities.deal || entities.dealNumber || "", mode: "insensitive" } },
              { client: { name: { contains: entities.deal || "", mode: "insensitive" } } },
            ],
          },
          select: DEAL_SELECT,
          take: 3,
        });
        searchData = { type: "deals", data: deals };
      } else if (entities.task || entities.title) {
        const tasks = await prisma.task.findMany({
          where: {
            title: { contains: entities.task || entities.title || "", mode: "insensitive" },
          },
          select: TASK_SELECT,
          take: 5,
        });
        searchData = { type: "tasks", data: tasks };
      } else if (entities.product || entities.sku) {
        const products = await prisma.warehouseStockItem.findMany({
          where: {
            OR: [
              { productName: { contains: entities.product || "", mode: "insensitive" } },
              { sku: { contains: entities.sku || "", mode: "insensitive" } },
            ],
          },
          select: PRODUCT_SELECT,
          take: 5,
        });
        searchData = { type: "products", data: products };
      } else {
        // Fallback: search clients by default
        const clients = await prisma.client.findMany({
          where: { name: { contains: intentResult.query || "", mode: "insensitive" } },
          select: CLIENT_SELECT,
          take: 3,
        });
        searchData = { type: "clients", data: clients };
      }

      // Step 3: Send data back to LLM for formatting
      const contextMsg = `Search results: ${JSON.stringify(searchData)}. Formulate a short answer in Russian.`;
      const response = await callAI([
        { role: "system", content: "You are an AI Coordinator. Answer based on provided data. Be concise." },
        { role: "user", content: contextMsg },
      ]);
      return res.json({ intent: "SEARCH", response, searchData });
    }

    if (intentResult.intent === "ACTION") {
      // Return action plan for frontend confirmation
      return res.json({
        intent: "ACTION",
        action: intentResult.action,
        payload: intentResult.payload,
        message: `Подтвердите действие: ${intentResult.action}`,
      });
    }

    res.json({ intent: "CHAT", response: "Не понял запрос." });
  } catch (err: any) {
    console.error("AI Coordinator Error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

// Execute confirmed action
router.post("/execute-action", async (req, res) => {
  try {
    const { action, payload, userId }: { action: string; payload: any; userId: string } = req.body;

    switch (action) {
      case "create_client": {
        const client = await prisma.client.create({
          data: {
            name: payload.name,
            phone: payload.phone || "",
            email: payload.email || "",
            inn: payload.inn || "",
            createdById: userId,
          },
        });
        return res.json({ success: true, id: client.id, message: `Клиент "${client.name}" создан` });
      }
      case "update_deal_status": {
        const deal = await prisma.deal.update({
          where: { id: payload.dealId },
          data: { status: payload.status },
        });
        return res.json({ success: true, message: `Статус сделки ${deal.dealNumber} обновлён` });
      }
      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: payload.title,
            description: payload.description || "",
            type: payload.type || "General",
            priority: payload.priority || "Medium",
            status: "New",
            createdById: userId,
            assigneeId: payload.assigneeId || undefined,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
          },
        });
        return res.json({ success: true, id: task.id, message: `Задача "${task.title}" создана` });
      }
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err: any) {
    console.error("Execute Action Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute action" });
  }
});

export default router;
