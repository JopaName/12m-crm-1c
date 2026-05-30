import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { callAI, ChatMessage } from "../ai/openCodeClient";

const router = Router();
const prisma = new PrismaClient();

const CLIENT_SELECT = { id: true, name: true, phone: true, email: true, inn: true, status: true };
const DEAL_SELECT = { id: true, dealNumber: true, status: true, expectedAmount: true, client: { select: { name: true } } };
const TASK_SELECT = { id: true, title: true, status: true, dueDate: true, assignee: { select: { firstName: true, lastName: true } } };
const PRODUCT_SELECT = { id: true, productName: true, sku: true, quantity: true, unit: true, category: { select: { name: true } } };

function ci(val: string) {
  return { contains: val };
}

function isWarehouseQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("склад") || lower.includes("складе") || lower.includes("лежит") ||
         lower.includes("остат") || lower.includes("товар") || lower.includes("продук") ||
         lower.includes("warehouse") || lower.includes("каталог");
}

function isClientQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("клиент") || lower.includes("найти") || lower.includes("найди") ||
         lower.includes("phone") || lower.includes("телефон") || lower.includes("inn");
}

function isDealQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("сделк") || lower.includes("deal") || lower.includes("статус");
}

function isTaskQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("задач") || lower.includes("task") || lower.includes("поручен");
}

function isActionQuery(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("создай") || lower.includes("создать") || lower.includes("добавь") ||
         lower.includes("измени") || lower.includes("обнови") || lower.includes("переведи");
}

async function handleSearch(lastMessage: string) {
  let searchData: any = null;
  let searchType = "unknown";

  if (isWarehouseQuery(lastMessage)) {
    const products = await prisma.warehouseStockItem.findMany({
      select: PRODUCT_SELECT,
      take: 10,
    });
    searchData = { type: "warehouse", data: products };
    searchType = "warehouse";
  } else if (isClientQuery(lastMessage)) {
    const clients = await prisma.client.findMany({
      select: CLIENT_SELECT,
      take: 5,
    });
    searchData = { type: "clients", data: clients };
    searchType = "clients";
  } else if (isDealQuery(lastMessage)) {
    const deals = await prisma.deal.findMany({
      select: DEAL_SELECT,
      take: 5,
    });
    searchData = { type: "deals", data: deals };
    searchType = "deals";
  } else if (isTaskQuery(lastMessage)) {
    const tasks = await prisma.task.findMany({
      select: TASK_SELECT,
      take: 5,
    });
    searchData = { type: "tasks", data: tasks };
    searchType = "tasks";
  }

  if (searchType === "warehouse") {
    const items = searchData.data;
    if (items.length === 0) {
      return { intent: "SEARCH" as const, response: "На складе пока нет товаров.", searchData };
    }
    let response = `На складе ${items.length} товаров:\n`;
    items.forEach((item: any) => {
      response += `• ${item.productName} — ${item.quantity} ${item.unit}`;
      if (item.category?.name) response += ` (${item.category.name})`;
      response += `\n`;
    });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "clients") {
    const clients = searchData.data;
    if (clients.length === 0) {
      return { intent: "SEARCH" as const, response: "Клиенты не найдены.", searchData };
    }
    let response = `Найдено ${clients.length} клиентов:\n`;
    clients.forEach((c: any) => {
      response += `• ${c.name} (${c.status || "без статуса"})\n`;
    });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "deals") {
    const deals = searchData.data;
    if (deals.length === 0) {
      return { intent: "SEARCH" as const, response: "Сделки не найдены.", searchData };
    }
    let response = `Найдено ${deals.length} сделок:\n`;
    deals.forEach((d: any) => {
      response += `• ${d.dealNumber} — ${d.status} (${d.expectedAmount?.toLocaleString()} ₽)\n`;
    });
    return { intent: "SEARCH" as const, response, searchData };
  }

  if (searchType === "tasks") {
    const tasks = searchData.data;
    if (tasks.length === 0) {
      return { intent: "SEARCH" as const, response: "Задачи не найдены.", searchData };
    }
    let response = `Найдено ${tasks.length} задач:\n`;
    tasks.forEach((t: any) => {
      response += `• ${t.title} — ${t.status}`;
      if (t.assignee) response += ` (${t.assignee.firstName})`;
      response += `\n`;
    });
    return { intent: "SEARCH" as const, response, searchData };
  }

  return null;
}

router.post("/coordinator", async (req, res) => {
  try {
    const { messages, userId }: { messages: ChatMessage[]; userId: string } = req.body;
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Rule-based intent detection (fast, no AI call needed)
    const isAction = isActionQuery(lastMessage);
    const isSearch = isWarehouseQuery(lastMessage) || isClientQuery(lastMessage) ||
                     isDealQuery(lastMessage) || isTaskQuery(lastMessage);

    if (isAction) {
      return res.json({
        intent: "ACTION",
        action: "unknown",
        payload: {},
        message: "Для создания и изменения данных используйте соответствующие разделы CRM.",
      });
    }

    if (isSearch) {
      const result = await handleSearch(lastMessage);
      if (result) {
        return res.json(result);
      }
    }

    // CHAT - use AI for conversational responses
    const systemPrompt = "You are an AI Coordinator for 12M CRM (solar panels manufacturing). Answer in Russian. Be concise and helpful.";
    const response = await callAI([
      { role: "system", content: systemPrompt },
      ...messages.slice(-5),
    ], 0.5, 200);
    return res.json({ intent: "CHAT", response: response || "Я здесь! Чем могу помочь?" });
  } catch (err: any) {
    console.error("AI Coordinator Error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

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
