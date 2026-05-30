import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { callAI, ChatMessage } from "../ai/openCodeClient";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const CLIENT_SELECT = { id: true, name: true, phone: true, email: true, inn: true, status: true };
const DEAL_SELECT = { id: true, dealNumber: true, status: true, expectedAmount: true, client: { select: { name: true } } };
const TASK_SELECT = { id: true, title: true, status: true, dueDate: true, assignee: { select: { firstName: true, lastName: true } } };
const PRODUCT_SELECT = { id: true, productName: true, sku: true, quantity: true, unit: true, category: { select: { name: true } } };
const USER_SELECT = { id: true, email: true, firstName: true, lastName: true, phone: true, role: { select: { name: true } }, isActive: true, apiKey: true };

function isWarehouseQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u0441\u043A\u043B\u0430\u0434") || lower.includes("\u0441\u043A\u043B\u0430\u0434\u0435") || lower.includes("\u043B\u0435\u0436\u0438\u0442") ||
         lower.includes("\u043E\u0441\u0442\u0430\u0442") || lower.includes("\u0442\u043E\u0432\u0430\u0440") || lower.includes("\u043F\u0440\u043E\u0434\u0443\u043A") ||
         lower.includes("warehouse") || lower.includes("\u043A\u0430\u0442\u0430\u043B\u043E\u0433");
}

function isClientQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u043A\u043B\u0438\u0435\u043D\u0442") || lower.includes("\u043D\u0430\u0439\u0442\u0438") || lower.includes("\u043D\u0430\u0439\u0434\u0438") ||
         lower.includes("phone") || lower.includes("\u0442\u0435\u043B\u0435\u0444\u043E\u043D") || lower.includes("inn");
}

function isDealQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u0441\u0434\u0435\u043B\u043A") || lower.includes("deal") || lower.includes("\u0441\u0442\u0430\u0442\u0443\u0441");
}

function isTaskQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u0437\u0430\u0434\u0430\u0447") || lower.includes("task") || lower.includes("\u043F\u043E\u0440\u0443\u0447\u0435\u043D");
}

function isUserQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B") || lower.includes("\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A") ||
         lower.includes("\u044E\u0437\u0435\u0440") || lower.includes("user") || lower.includes("\u043A\u0435\u0439");
}

function isActionQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("\u0441\u043E\u0437\u0434\u0430\u0439") || lower.includes("\u0441\u043E\u0437\u0434\u0430\u0442\u044C") || lower.includes("\u0434\u043E\u0431\u0430\u0432\u044C") ||
         lower.includes("\u0438\u0437\u043C\u0435\u043D\u0438") || lower.includes("\u043E\u0431\u043D\u043E\u0432\u0438") || lower.includes("\u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0438") ||
         lower.includes("\u0443\u0434\u0430\u043B\u0438") || lower.includes("\u0443\u0434\u0430\u043B\u0438\u0442\u044C");
}

async function handleSearch(lastMessage: string) {
  let searchData: any = null;
  let searchType = "unknown";

  if (isWarehouseQuery(lastMessage)) {
    const products = await prisma.warehouseStockItem.findMany({ select: PRODUCT_SELECT, take: 10 });
    searchData = { type: "warehouse", data: products };
    searchType = "warehouse";
  } else if (isClientQuery(lastMessage)) {
    const clients = await prisma.client.findMany({ select: CLIENT_SELECT, take: 5 });
    searchData = { type: "clients", data: clients };
    searchType = "clients";
  } else if (isDealQuery(lastMessage)) {
    const deals = await prisma.deal.findMany({ select: DEAL_SELECT, take: 5 });
    searchData = { type: "deals", data: deals };
    searchType = "deals";
  } else if (isTaskQuery(lastMessage)) {
    const tasks = await prisma.task.findMany({ select: TASK_SELECT, take: 5 });
    searchData = { type: "tasks", data: tasks };
    searchType = "tasks";
  } else if (isUserQuery(lastMessage)) {
    const users = await prisma.user.findMany({ select: USER_SELECT, take: 10, where: { isArchived: false } });
    searchData = { type: "users", data: users.map((u: any) => ({ ...u, apiKey: u.apiKey ? "***" : null })) };
    searchType = "users";
  }

  if (searchType === "warehouse") {
    const items = searchData.data;
    if (items.length === 0) return { intent: "SEARCH" as const, response: "\u041D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0442\u043E\u0432\u0430\u0440\u043E\u0432.", searchData };
    let response = `\u041D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435 ${items.length} \u0442\u043E\u0432\u0430\u0440\u043E\u0432:\n`;
    items.forEach((item: any) => { response += `\u2022 ${item.productName} \u2014 ${item.quantity} ${item.unit}`; if (item.category?.name) response += ` (${item.category.name})`; response += `\n`; });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "clients") {
    const clients = searchData.data;
    if (clients.length === 0) return { intent: "SEARCH" as const, response: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.", searchData };
    let response = `\u041D\u0430\u0439\u0434\u0435\u043D\u043E ${clients.length} \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432:\n`;
    clients.forEach((c: any) => { response += `\u2022 ${c.name} (${c.status || "\u0431\u0435\u0437 \u0441\u0442\u0430\u0442\u0443\u0441\u0430"})\n`; });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "deals") {
    const deals = searchData.data;
    if (deals.length === 0) return { intent: "SEARCH" as const, response: "\u0421\u0434\u0435\u043B\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.", searchData };
    let response = `\u041D\u0430\u0439\u0434\u0435\u043D\u043E ${deals.length} \u0441\u0434\u0435\u043B\u043E\u043A:\n`;
    deals.forEach((d: any) => { response += `\u2022 ${d.dealNumber} \u2014 ${d.status} (${d.expectedAmount?.toLocaleString()} \u20BD)\n`; });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "tasks") {
    const tasks = searchData.data;
    if (tasks.length === 0) return { intent: "SEARCH" as const, response: "\u0417\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.", searchData };
    let response = `\u041D\u0430\u0439\u0434\u0435\u043D\u043E ${tasks.length} \u0437\u0430\u0434\u0430\u0447:\n`;
    tasks.forEach((t: any) => { response += `\u2022 ${t.title} \u2014 ${t.status}`; if (t.assignee) response += ` (${t.assignee.firstName})`; response += `\n`; });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "users") {
    const users = searchData.data;
    if (users.length === 0) return { intent: "SEARCH" as const, response: "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.", searchData };
    let response = `\u041D\u0430\u0439\u0434\u0435\u043D\u043E ${users.length} \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432:\n`;
    users.forEach((u: any) => { response += `\u2022 ${u.firstName} ${u.lastName} (${u.email}, ${u.role?.name})${u.isActive ? "" : " [\u043D\u0435\u0430\u043A\u0442\u0438\u0432\u0435\u043D]"}\n`; });
    return { intent: "SEARCH" as const, response, searchData };
  }

  return null;
}

router.post("/coordinator", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { messages }: { messages: ChatMessage[] } = req.body;
    const u = req.user!;
    const lastMessage = messages[messages.length - 1]?.content || "";
    const userApiKey = u.apiKey || undefined;

    const isAdmin = u.roleName === "Administrator" || u.roleName === "Director";
    const isAction = isActionQuery(lastMessage);
    const isSearch = isWarehouseQuery(lastMessage) || isClientQuery(lastMessage) ||
                     isDealQuery(lastMessage) || isTaskQuery(lastMessage) ||
                     (isAdmin && isUserQuery(lastMessage));

    if (isAction && isAdmin) {
      const lower = lastMessage.toLowerCase();
      if ((lower.includes("\u0441\u043E\u0437\u0434\u0430\u0439") || lower.includes("\u0441\u043E\u0437\u0434\u0430\u0442\u044C") || lower.includes("\u0434\u043E\u0431\u0430\u0432\u044C")) && isUserQuery(lastMessage)) {
        return res.json({
          intent: "ACTION", action: "create_user", payload: {},
          message: "\u0414\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0443\u043A\u0430\u0436\u0438\u0442\u0435: \u0438\u043C\u044F, \u0444\u0430\u043C\u0438\u043B\u0438\u044E, email, \u0440\u043E\u043B\u044C. \u0418\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0440\u0430\u0437\u0434\u0435\u043B '\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438'.",
        });
      }
      if ((lower.includes("\u0443\u0434\u0430\u043B\u0438") || lower.includes("\u0443\u0434\u0430\u043B\u0438\u0442\u044C")) && isUserQuery(lastMessage)) {
        return res.json({
          intent: "ACTION", action: "delete_user", payload: {},
          message: "\u0414\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0443\u043A\u0430\u0436\u0438\u0442\u0435 email \u0438\u043B\u0438 ID. \u0418\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0440\u0430\u0437\u0434\u0435\u043B '\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438'.",
        });
      }
    }

    if (isAction) {
      return res.json({
        intent: "ACTION", action: "unknown", payload: {},
        message: isAdmin
          ? "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440: \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435 (\u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F, \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0438 \u0442.\u0434.)."
          : "\u0414\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B CRM.",
      });
    }

    if (isSearch) {
      const result = await handleSearch(lastMessage);
      if (result) return res.json(result);
    }

    // CHAT - use AI with user's personal API key
    const systemPrompt = `You are an AI Coordinator for 12M CRM (solar panels manufacturing). Answer in Russian. Be concise and helpful.
User: ${u.firstName} ${u.lastName} (${u.roleName}).`;
    const response = await callAI([
      { role: "system", content: systemPrompt },
      ...messages.slice(-5),
    ], userApiKey, 0.5, 200);
    return res.json({ intent: "CHAT", response: response || "\u042F \u0437\u0434\u0435\u0441\u044C! \u0427\u0435\u043C \u043C\u043E\u0433\u0443 \u043F\u043E\u043C\u043E\u0447\u044C?" });
  } catch (err: any) {
    console.error("AI Coordinator Error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

router.post("/execute-action", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { action, payload }: { action: string; payload: any } = req.body;
    const u = req.user!;
    const isAdmin = u.roleName === "Administrator" || u.roleName === "Director";

    switch (action) {
      case "create_client": {
        const client = await prisma.client.create({
          data: { name: payload.name, phone: payload.phone || "", email: payload.email || "", inn: payload.inn || "", createdById: u.id },
        });
        return res.json({ success: true, id: client.id, message: `\u041A\u043B\u0438\u0435\u043D\u0442 "${client.name}" \u0441\u043E\u0437\u0434\u0430\u043D` });
      }
      case "update_deal_status": {
        const deal = await prisma.deal.update({
          where: { id: payload.dealId },
          data: { status: payload.status },
        });
        return res.json({ success: true, message: `\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u0434\u0435\u043B\u043A\u0438 ${deal.dealNumber} \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D` });
      }
      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: payload.title, description: payload.description || "", type: payload.type || "General",
            priority: payload.priority || "Medium", status: "New", createdById: u.id,
            assigneeId: payload.assigneeId || undefined, dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
          },
        });
        return res.json({ success: true, id: task.id, message: `\u0417\u0430\u0434\u0430\u0447\u0430 "${task.title}" \u0441\u043E\u0437\u0434\u0430\u043D\u0430` });
      }
      case "create_user": {
        if (!isAdmin) return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" });
        const bcrypt = require("bcryptjs");
        const passwordHash = await bcrypt.hash(payload.password || "123456", 10);
        const role = await prisma.role.findFirst({ where: { name: payload.roleName || "Manager" } });
        if (!role) return res.status(400).json({ error: `\u0420\u043E\u043B\u044C "${payload.roleName}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430` });
        const newUser = await prisma.user.create({
          data: {
            email: payload.email, passwordHash, firstName: payload.firstName, lastName: payload.lastName,
            phone: payload.phone || "", roleId: role.id,
          },
          select: USER_SELECT,
        });
        return res.json({ success: true, id: newUser.id, message: `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C "${newUser.firstName} ${newUser.lastName}" \u0441\u043E\u0437\u0434\u0430\u043D`, user: { ...newUser, apiKey: newUser.apiKey ? "***" : null } });
      }
      case "delete_user": {
        if (!isAdmin) return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0443\u0434\u0430\u043B\u044F\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" });
        const target = await prisma.user.findFirst({ where: { OR: [{ email: payload.email }, { id: payload.userId }] } });
        if (!target) return res.status(404).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
        if (target.id === u.id) return res.status(400).json({ error: "\u041D\u0435\u043B\u044C\u0437\u044F \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0435\u0431\u044F" });
        await prisma.user.update({ where: { id: target.id }, data: { isArchived: true, isActive: false } });
        return res.json({ success: true, message: `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C "${target.firstName} ${target.lastName}" \u0434\u0435\u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D` });
      }
      case "update_user_apikey": {
        if (!isAdmin) return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C API \u043A\u043B\u044E\u0447\u0430\u043C\u0438" });
        const target = await prisma.user.findFirst({ where: { OR: [{ email: payload.email }, { id: payload.userId }] } });
        if (!target) return res.status(404).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
        await prisma.user.update({ where: { id: target.id }, data: { apiKey: payload.apiKey || null } });
        return res.json({ success: true, message: `API \u043A\u043B\u044E\u0447 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D \u0434\u043B\u044F "${target.firstName} ${target.lastName}"` });
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
