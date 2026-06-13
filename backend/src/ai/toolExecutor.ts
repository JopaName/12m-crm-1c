import { prisma } from "../index";

const DIRECTOR_ROLES = ["Administrator", "Director"];

function isDirector(user: { roleName: string }): boolean {
  return DIRECTOR_ROLES.includes(user.roleName);
}

function toModelKey(name: string): string {
  const map: Record<string, string> = {
    "client": "client", "clients": "client",
    "lead": "lead", "leads": "lead",
    "deal": "deal", "deals": "deal",
    "task": "task", "tasks": "task",
    "user": "user", "users": "user",
    "role": "role", "roles": "role",
    "rolepermission": "rolePermission", "permission": "rolePermission",
    "product": "product", "products": "product",
    "productitem": "productItem", "productitems": "productItem",
    "warehousestockitem": "warehouseStockItem", "stockitem": "warehouseStockItem", "stock": "warehouseStockItem",
    "warehousecategory": "warehouseCategory", "warehousecategories": "warehouseCategory",
    "warehousetransfer": "warehouseTransfer", "transfer": "warehouseTransfer",
    "warehousemovement": "warehouseMovement",
    "productionorder": "productionOrder", "productionorders": "productionOrder",
    "productionroute": "productionRoute",
    "productionstep": "productionStep",
    "installationtask": "installationTask", "installationtasks": "installationTask",
    "installationcalendarevent": "installationCalendarEvent",
    "rentcontract": "rentContract", "rentcontracts": "rentContract",
    "billingrecord": "billingRecord",
    "invoice": "invoice", "invoices": "invoice",
    "payment": "payment", "payments": "payment",
    "cashorder": "cashOrder",
    "agentcommissionrecord": "agentCommissionRecord",
    "servicecase": "serviceCase", "servicecases": "serviceCase",
    "defectrecord": "defectRecord",
    "supplier": "supplier", "suppliers": "supplier",
    "supplierorder": "supplierOrder",
    "purchaserequest": "purchaseRequest",
    "legaldocument": "legalDocument", "legaldocuments": "legalDocument",
    "legaldocumentcomment": "legalDocumentComment",
    "telemetrydevice": "telemetryDevice",
    "telemetryreading": "telemetryReading",
    "chatmessage": "chatMessage",
    "notification": "notification", "notifications": "notification",
    "project": "project", "projects": "project",
    "specification": "specification",
    "clientaction": "clientAction",
    "actionmessage": "actionMessage",
    "actionfile": "actionFile",
    "reserve": "reserve",
    "inventorybalance": "inventoryBalance",
    "warehousecell": "warehouseCell",
    "tariffrate": "tariffRate",
  };
  return map[name.toLowerCase().replace(/\s/g, "")] || name;
}

export async function executeTool(
  name: string,
  args: any,
  user: { id: string; email: string; roleName: string; firstName: string; lastName: string },
  isAdmin: boolean
): Promise<{ ok: boolean; data?: any; msg: string }> {
  try {
    switch (name) {

      case "search_client": {
        const q = args.query || "";
        const r = await prisma.client.findMany({
          where: { isArchived: false, OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }, { inn: { contains: q } }] },
          take: 10,
          select: { id: true, name: true, phone: true, email: true, inn: true, status: true, contactPerson: true },
        });
        return { ok: true, data: r, msg: r.length + " clients found" };
      }

      case "get_client": {
        const c = await prisma.client.findUnique({
          where: { id: args.client_id },
          include: { deals: { take: 5 }, invoices: { take: 5 }, payments: { take: 5 }, clientActions: { take: 5, orderBy: { createdAt: "desc" } } },
        });
        if (!c) return { ok: false, msg: "Client not found" };
        return { ok: true, data: c, msg: "Client info" };
      }

      case "create_client": {
        const c = await prisma.client.create({
          data: {
            name: args.name, phone: args.phone || null, email: args.email || null, inn: args.inn || undefined,
            kpp: args.kpp || undefined, ogrn: args.ogrn || undefined, legalAddress: args.legalAddress || "",
            actualAddress: args.actualAddress || "", contactPerson: args.contactPerson || "",
            source: args.source || "", notes: args.notes || "", createdById: user.id,
          },
        });
        return { ok: true, data: c, msg: "Client created: " + c.name };
      }

      case "update_client": {
        const ex = await prisma.client.findUnique({ where: { id: args.client_id } });
        if (!ex) return { ok: false, msg: "Client not found" };
        if (!isDirector(user) && ex.createdById !== user.id) return { ok: false, msg: "Only Director or creator can edit" };
        const d: any = {};
        ["name","phone","email","inn","kpp","ogrn","legalAddress","actualAddress","contactPerson","status","notes"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        const u = await prisma.client.update({ where: { id: args.client_id }, data: d });
        return { ok: true, data: u, msg: "Client updated" };
      }

      case "archive_client": {
        if (!isDirector(user)) return { ok: false, msg: "Only Director can archive clients" };
        await prisma.client.update({ where: { id: args.client_id }, data: { isArchived: true } });
        return { ok: true, data: null, msg: "Client archived" };
      }

      case "create_deal": {
        const d = await prisma.deal.create({
          data: {
            dealNumber: "D-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 10000)).padStart(4, "0"),
            dealType: args.dealType || "Sale", status: "New",
            clientId: args.client_id, responsibleAgentId: user.id,
            expectedAmount: args.expectedAmount || 0, description: args.description || "",
          },
        });
        return { ok: true, data: d, msg: "Deal created: " + d.dealNumber };
      }

      case "get_deal": {
        const d = await prisma.deal.findUnique({
          where: { id: args.deal_id },
          include: { client: true, tasks: { take: 5 }, invoices: { take: 5 }, payments: { take: 5 }, responsibleAgent: { select: { firstName: true, lastName: true } } },
        });
        if (!d) return { ok: false, msg: "Deal not found" };
        return { ok: true, data: d, msg: "Deal info" };
      }

      case "update_deal_status": {
        const d = await prisma.deal.update({ where: { id: args.deal_id }, data: { status: args.status } });
        try { await prisma.notification.create({ data: { userId: d.responsibleAgentId, type: "deal_status", title: "Deal " + d.dealNumber + " -> " + args.status, entityType: "Deal", entityId: d.id } }); } catch {}
        return { ok: true, data: d, msg: "Deal status -> " + args.status };
      }

      case "list_deals": {
        const w: any = { isArchived: false };
        if (user.roleName === "Agent") w.responsibleAgentId = user.id;
        if (args.status) w.status = args.status;
        const r = await prisma.deal.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } });
        return { ok: true, data: r, msg: r.length + " deals" };
      }

      case "create_task": {
        const t = await prisma.task.create({
          data: {
            title: args.title, description: args.description || "", type: "General",
            priority: args.priority || "Medium", status: "New",
            assigneeId: args.assignee_id, dealId: args.deal_id,
            dueDate: args.deadline ? new Date(args.deadline) : null, createdById: user.id,
          },
        });
        if (args.assignee_id) {
          try { await prisma.notification.create({ data: { userId: args.assignee_id, type: "task_assigned", title: "New task: " + args.title, entityType: "Task", entityId: t.id } }); } catch {}
        }
        return { ok: true, data: t, msg: "Task created: " + t.title };
      }

      case "update_task": {
        const d: any = {};
        ["title","description","status","priority"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        if (args.assignee_id !== undefined) d.assigneeId = args.assignee_id;
        if (args.dueDate !== undefined) d.dueDate = new Date(args.dueDate);
        const t = await prisma.task.update({ where: { id: args.task_id }, data: d });
        return { ok: true, data: t, msg: "Task updated" };
      }

      case "list_tasks": {
        const w: any = {};
        if (user.roleName === "Agent") w.assigneeId = user.id;
        if (args.status) w.status = args.status;
        if (args.assignee_id) w.assigneeId = args.assignee_id;
        const r = await prisma.task.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { assignee: { select: { firstName: true, lastName: true } } } });
        return { ok: true, data: r, msg: r.length + " tasks" };
      }

      case "create_product": {
        const p = await prisma.product.create({
          data: { name: args.name, sku: args.sku, description: args.description || "", category: args.category || "", unit: args.unit, purchasePrice: args.purchasePrice ? +args.purchasePrice : null, salePrice: args.salePrice ? +args.salePrice : null, rentPrice: args.rentPrice ? +args.rentPrice : null },
        });
        return { ok: true, data: p, msg: "Product created: " + p.name };
      }

      case "update_product": {
        const d: any = {};
        ["name","description","category","unit"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        ["purchasePrice","salePrice","rentPrice"].forEach(k => { if (args[k] !== undefined) d[k] = +args[k]; });
        const p = await prisma.product.update({ where: { id: args.product_id }, data: d });
        return { ok: true, data: p, msg: "Product updated" };
      }

      case "get_warehouse_stock": {
        const w: any = {};
        if (args.category) w.category = { name: { contains: args.category } };
        const r = await prisma.warehouseStockItem.findMany({ where: w, take: 30, include: { category: { select: { name: true } } }, orderBy: { productName: "asc" } });
        return { ok: true, data: r, msg: r.length + " stock items" };
      }

      case "create_stock_item": {
        const i = await prisma.warehouseStockItem.create({
          data: { categoryId: args.categoryId, productName: args.productName, quantity: +args.quantity || 0, unit: args.unit, sku: args.sku || "", purchasePrice: args.purchasePrice ? +args.purchasePrice : null, salePrice: args.salePrice ? +args.salePrice : null, note: args.note || "" },
        });
        return { ok: true, data: i, msg: "Stock item created: " + i.productName };
      }

      case "transfer_stock": {
        if (!args.item_id || !args.from_category_id || !args.to_category_id || !args.quantity) return { ok: false, msg: "Missing required fields" };
        const src = await prisma.warehouseStockItem.findUnique({ where: { id: args.item_id } });
        if (!src) return { ok: false, msg: "Source item not found" };
        const qty = +args.quantity;
        if (src.quantity < qty) return { ok: false, msg: "Insufficient. Available: " + src.quantity };
        await prisma.warehouseStockItem.update({ where: { id: args.item_id }, data: { quantity: { decrement: qty } } });
        const dest = await prisma.warehouseStockItem.findFirst({ where: { categoryId: args.to_category_id, productName: src.productName } });
        if (dest) await prisma.warehouseStockItem.update({ where: { id: dest.id }, data: { quantity: { increment: qty } } });
        else await prisma.warehouseStockItem.create({ data: { categoryId: args.to_category_id, productName: src.productName, quantity: qty, unit: src.unit, sku: src.sku || "" } });
        try { await prisma.warehouseTransfer.create({ data: { productItemId: "ai-stock-transfer", productName: src.productName, quantity: qty, fromCategoryId: args.from_category_id, toCategoryId: args.to_category_id, note: args.note || "AI transfer" } }); } catch (e) {}
        return { ok: true, data: null, msg: "Transferred " + qty + " " + src.unit + " of " + src.productName };
      }

      case "list_warehouse_categories": {
        const r = await prisma.warehouseCategory.findMany({ orderBy: { name: "asc" } });
        return { ok: true, data: r, msg: r.length + " categories" };
      }

      case "create_warehouse_category": {
        const c = await prisma.warehouseCategory.create({ data: { name: args.name, parentId: args.parentId || null } });
        return { ok: true, data: c, msg: "Category created: " + c.name };
      }

      case "list_employees": {
        const w: any = { isArchived: false };
        if (args.role) w.role = { name: args.role };
        const r = await prisma.user.findMany({ where: w, select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, role: { select: { name: true } } }, orderBy: { firstName: "asc" } });
        return { ok: true, data: r, msg: r.length + " employees" };
      }

      case "get_employee_salary": {
        if (!isDirector(user)) return { ok: false, msg: "Only Directors can view salary data" };
        const emp = await prisma.user.findUnique({ where: { id: args.employee_id }, select: { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true } } } });
        if (!emp) return { ok: false, msg: "Employee not found" };
        const role = await prisma.role.findFirst({ where: { name: emp.role?.name } });
        const rates = role ? await prisma.tariffRate.findMany({ where: { roleId: role.id } }) : [];
        return { ok: true, data: { ...emp, tariffRates: rates }, msg: "Employee salary data" };
      }

      case "list_leads": {
        const w: any = {};
        if (args.status) w.status = args.status;
        const r = await prisma.lead.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { assignedAgent: { select: { firstName: true, lastName: true } } } });
        return { ok: true, data: r, msg: r.length + " leads" };
      }

      case "create_lead": {
        const l = await prisma.lead.create({ data: { clientName: args.clientName, clientPhone: args.clientPhone, clientEmail: args.clientEmail || "", source: args.source || "Manual", status: args.status || "New", assignedAgentId: user.id } });
        return { ok: true, data: l, msg: "Lead created: " + l.clientName };
      }

      case "list_invoices": {
        const w: any = {};
        if (args.status) w.status = args.status;
        if (args.client_id) w.clientId = args.client_id;
        const r = await prisma.invoice.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } }, deal: { select: { dealNumber: true } } } });
        return { ok: true, data: r, msg: r.length + " invoices" };
      }

      case "create_invoice": {
        const inv = await prisma.invoice.create({
          data: { invoiceNumber: "INV-" + Date.now(), clientId: args.client_id, dealId: args.deal_id, amount: +args.amount, status: args.status || "Pending", dueDate: args.dueDate ? new Date(args.dueDate) : null },
        });
        return { ok: true, data: inv, msg: "Invoice created: " + inv.invoiceNumber };
      }

      case "list_payments": {
        const w: any = {};
        if (args.status) w.status = args.status;
        if (args.client_id) w.clientId = args.client_id;
        const r = await prisma.payment.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } });
        return { ok: true, data: r, msg: r.length + " payments" };
      }

      case "list_production_orders": {
        const w: any = {};
        if (args.status) w.status = args.status;
        const r = await prisma.productionOrder.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { deal: { select: { dealNumber: true } } } });
        return { ok: true, data: r, msg: r.length + " production orders" };
      }

      case "update_production_status": {
        const o = await prisma.productionOrder.update({ where: { id: args.order_id }, data: { status: args.status } });
        return { ok: true, data: o, msg: "Order status -> " + args.status };
      }

      case "list_installations": {
        const w: any = {};
        if (args.status) w.status = args.status;
        const r = await prisma.installationTask.findMany({ where: w, take: args.limit || 20, orderBy: { installDate: "desc" }, include: { deal: { select: { dealNumber: true } }, installer: { select: { firstName: true, lastName: true } } } });
        return { ok: true, data: r, msg: r.length + " installation tasks" };
      }

      case "get_installation_calendar": {
        const w: any = {};
        if (args.installer_id) w.installerId = args.installer_id;
        const r = await prisma.installationCalendarEvent.findMany({ where: w, orderBy: { startDate: "asc" }, include: { installer: { select: { firstName: true, lastName: true } } } });
        return { ok: true, data: r, msg: r.length + " calendar events" };
      }

      case "list_legal_documents": {
        const w: any = {};
        if (args.documentType) w.documentType = args.documentType;
        if (args.status) w.status = args.status;
        const r = await prisma.legalDocument.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } }, deal: { select: { dealNumber: true } } } });
        return { ok: true, data: r, msg: r.length + " legal documents" };
      }

      case "list_service_cases": {
        const w: any = {};
        if (args.status) w.status = args.status;
        const r = await prisma.serviceCase.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } });
        return { ok: true, data: r, msg: r.length + " service cases" };
      }

      case "list_rent_contracts": {
        const w: any = {};
        if (args.status) w.status = args.status;
        const r = await prisma.rentContract.findMany({ where: w, take: args.limit || 20, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } });
        return { ok: true, data: r, msg: r.length + " rent contracts" };
      }

      case "list_suppliers": {
        const r = await prisma.supplier.findMany({ where: { isArchived: false }, take: args.limit || 20, orderBy: { name: "asc" } });
        return { ok: true, data: r, msg: r.length + " suppliers" };
      }

      case "create_supplier": {
        const s = await prisma.supplier.create({ data: { name: args.name, contactPerson: args.contactPerson || "", phone: args.phone || null, email: args.email || null, inn: args.inn || undefined, address: args.address || "" } });
        return { ok: true, data: s, msg: "Supplier created: " + s.name };
      }

      case "list_products": {
        const w: any = {};
        if (args.category) w.category = { contains: args.category };
        const r = await prisma.product.findMany({ where: w, take: args.limit || 20, orderBy: { name: "asc" } });
        return { ok: true, data: r, msg: r.length + " products" };
      }

      case "get_notifications": {
        const [unread, all] = await Promise.all([
          prisma.notification.count({ where: { userId: user.id, isRead: false } }),
          prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
        ]);
        return { ok: true, data: { unread, items: all }, msg: unread + " unread of " + all.length };
      }

      case "mark_notification_read": {
        await prisma.notification.update({ where: { id: args.notification_id }, data: { isRead: true } });
        return { ok: true, data: null, msg: "Notification marked read" };
      }

      case "get_dashboard_summary": {
        const [clients, deals, tasks, products, users] = await Promise.all([
          prisma.client.count({ where: { isArchived: false } }),
          prisma.deal.count({ where: { isArchived: false } }),
          prisma.task.count({ where: { isArchived: false } }),
          prisma.warehouseStockItem.findMany({ take: 10, include: { category: { select: { name: true } } } }),
          prisma.user.count({ where: { isArchived: false } }),
        ]);
        const recentDeals = await prisma.deal.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } });
        return { ok: true, data: { clients, deals: recentDeals, tasks, products, users }, msg: "Dashboard summary" };
      }

      case "get_dashboard_finance": {
        const inv = await prisma.invoice.aggregate({ _sum: { amount: true } });
        const paid = await prisma.payment.aggregate({ _sum: { amount: true } });
        const overdue = await prisma.invoice.findMany({ where: { status: "Overdue" }, select: { amount: true } });
        return { ok: true, data: { totalInvoiced: inv._sum.amount || 0, totalPaid: paid._sum.amount || 0, overdueCount: overdue.length }, msg: "Finance KPIs" };
      }

      case "get_dashboard_pulse": {
        const [prodInProgress, newLeadsToday, overdueTasks] = await Promise.all([
          prisma.productionOrder.count({ where: { status: { not: "Completed" } } }),
          prisma.lead.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
          prisma.task.count({ where: { status: { not: "Completed" }, dueDate: { lt: new Date() } } }),
        ]);
        return { ok: true, data: { ordersInProgress: prodInProgress, newLeadsToday, overdueTasks }, msg: "Live KPIs" };
      }

      case "get_audit_log": {
        if (!isDirector(user)) return { ok: false, msg: "Only Directors can view audit logs" };
        const r = await prisma.auditLog.findMany({ where: { entityType: args.entityType, entityId: args.entityId }, orderBy: { createdAt: "desc" }, take: 50 });
        return { ok: true, data: r, msg: r.length + " audit entries" };
      }

      case "send_chat_message": {
        const m = await prisma.chatMessage.create({ data: { senderId: user.id, receiverId: args.receiver_id, content: args.content } });
        return { ok: true, data: m, msg: "Message sent" };
      }

      case "list_conversations": {
        const r = await prisma.chatMessage.findMany({
          where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
          orderBy: { createdAt: "desc" }, take: 50, distinct: ["senderId", "receiverId"],
          include: { sender: { select: { firstName: true, lastName: true } }, receiver: { select: { firstName: true, lastName: true } } },
        });
        return { ok: true, data: r, msg: "Conversations" };
      }


      case "create_user": {
        const bcrypt = require("bcryptjs");
        const role = await prisma.role.findFirst({ where: { name: args.roleName || "Agent" } });
        if (!role) return { ok: false, msg: "Role not found: " + args.roleName };
        const hash = await bcrypt.hash(args.password, 10);
        const u = await prisma.user.create({ data: { email: args.email, passwordHash: hash, firstName: args.firstName, lastName: args.lastName, phone: args.phone || null, roleId: role.id } });
        return { ok: true, data: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }, msg: "User created: " + u.email };
      }

      case "update_user": {
        const d: any = {};
        ["email","firstName","lastName","phone"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        if (args.isActive !== undefined) d.isActive = !!args.isActive;
        const u = await prisma.user.update({ where: { id: args.user_id }, data: d });
        return { ok: true, data: u, msg: "User updated" };
      }

      case "archive_user": {
        await prisma.user.update({ where: { id: args.user_id }, data: { isArchived: true, isActive: false } });
        return { ok: true, data: null, msg: "User archived" };
      }

      case "list_roles": {
        const r = await prisma.role.findMany({ include: { _count: { select: { users: true } }, permissions: { select: { permission: true } } }, orderBy: { name: "asc" } });
        return { ok: true, data: r, msg: r.length + " roles" };
      }

      case "create_role": {
        const role = await prisma.role.create({ data: { name: args.name, description: args.description || "" } });
        if (args.permissions && Array.isArray(args.permissions)) {
          for (const p of args.permissions) {
            await prisma.rolePermission.create({ data: { roleId: role.id, permission: p } });
          }
        }
        return { ok: true, data: role, msg: "Role created: " + role.name };
      }

      case "update_lead": {
        const d: any = {};
        ["status","clientName","clientPhone","clientEmail","notes"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        const l = await prisma.lead.update({ where: { id: args.lead_id }, data: d });
        return { ok: true, data: l, msg: "Lead updated" };
      }

      case "update_invoice": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.paidAt) d.paidAt = new Date(args.paidAt);
        const inv = await prisma.invoice.update({ where: { id: args.invoice_id }, data: d });
        return { ok: true, data: inv, msg: "Invoice updated" };
      }

      case "create_payment": {
        const p = await prisma.payment.create({
          data: { paymentNumber: "PAY-" + Date.now(), clientId: args.client_id, invoiceId: args.invoice_id || null, dealId: args.deal_id || null, amount: +args.amount, method: args.method, status: args.status || "Pending" },
        });
        return { ok: true, data: p, msg: "Payment recorded: " + p.paymentNumber };
      }

      case "confirm_payment": {
        if (!isDirector(user)) return { ok: false, msg: "Only Directors can confirm payments" };
        const pm = await prisma.payment.update({ where: { id: args.payment_id }, data: { status: "Confirmed", confirmedById: user.id, paidAt: new Date() } });
        if (pm.invoiceId) await prisma.invoice.update({ where: { id: pm.invoiceId }, data: { status: "Paid", paidAt: new Date() } });
        return { ok: true, data: pm, msg: "Payment confirmed" };
      }

      case "create_cash_order": {
        const co = await prisma.cashOrder.create({ data: { type: args.type, amount: +args.amount, category: args.category, description: args.description || "", dealId: args.deal_id || null, createdById: user.id } });
        return { ok: true, data: co, msg: "Cash order created: " + co.type + " " + co.amount };
      }

      case "create_production_order": {
        const po = await prisma.productionOrder.create({ data: { dealId: args.deal_id, specificationId: args.specificationId || null, productionRouteId: args.productionRouteId || null, status: "New" } });
        return { ok: true, data: po, msg: "Production order created" };
      }

      case "create_production_route": {
        const pr = await prisma.productionRoute.create({ data: { name: args.name, description: args.description || "" } });
        return { ok: true, data: pr, msg: "Route created: " + pr.name };
      }

      case "create_project": {
        const proj = await prisma.project.create({
          data: { dealId: args.deal_id, installTimeDays: args.installTimeDays ? +args.installTimeDays : null, workersCount: args.workersCount ? +args.workersCount : null, installCost: args.installCost ? +args.installCost : null, gpsCoordinates: args.gpsCoordinates || null, photoBefore: args.photoBefore || null },
        });
        return { ok: true, data: proj, msg: "Project created for deal " + args.deal_id };
      }

      case "update_project": {
        const d: any = {};
        ["chiefEngineerApproval","gpsCoordinates"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        if (args.installTimeDays !== undefined) d.installTimeDays = +args.installTimeDays;
        if (args.workersCount !== undefined) d.workersCount = +args.workersCount;
        if (args.installCost !== undefined) d.installCost = +args.installCost;
        const p = await prisma.project.update({ where: { id: args.project_id }, data: d });
        return { ok: true, data: p, msg: "Project updated" };
      }

      case "create_installation_task": {
        const t = await prisma.installationTask.create({ data: { dealId: args.deal_id, installerId: args.installer_id, installDate: new Date(args.installDate), plannedEndDate: args.plannedEndDate ? new Date(args.plannedEndDate) : null, status: "Scheduled", notes: args.notes || "" } });
        return { ok: true, data: t, msg: "Installation task created" };
      }

      case "update_installation_task": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.installDate) d.installDate = new Date(args.installDate);
        if (args.notes !== undefined) d.notes = args.notes;
        const t = await prisma.installationTask.update({ where: { id: args.task_id }, data: d });
        return { ok: true, data: t, msg: "Installation updated" };
      }

      case "create_installation_event": {
        const e = await prisma.installationCalendarEvent.create({ data: { installationTaskId: args.installationTaskId, title: args.title, startDate: new Date(args.startDate), endDate: new Date(args.endDate), installerId: args.installerId, status: "Scheduled" } });
        return { ok: true, data: e, msg: "Event created" };
      }

      case "create_legal_document": {
        const ld = await prisma.legalDocument.create({ data: { documentType: args.documentType, dealId: args.deal_id || null, clientId: args.client_id || null, responsibleLawyerId: args.responsibleLawyerId || null, documentNumber: args.documentNumber || null, status: "Draft", fileDraft: args.fileDraft || null } });
        return { ok: true, data: ld, msg: "Legal document created: " + ld.documentType };
      }

      case "update_legal_document": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.documentNumber) d.documentNumber = args.documentNumber;
        if (args.fileSigned) d.fileSigned = args.fileSigned;
        if (args.status === "Approved") d.approvedAt = new Date();
        if (args.status === "Signed") d.signedAt = new Date();
        const ld = await prisma.legalDocument.update({ where: { id: args.document_id }, data: d });
        return { ok: true, data: ld, msg: "Legal document updated" };
      }

      case "create_legal_comment": {
        const c = await prisma.legalDocumentComment.create({ data: { legalDocumentId: args.document_id, userId: user.id, content: args.content } });
        return { ok: true, data: c, msg: "Comment added" };
      }

      case "create_service_case": {
        const sc = await prisma.serviceCase.create({ data: { clientId: args.client_id, dealId: args.deal_id || null, type: args.type, status: "New", description: args.description || "" } });
        return { ok: true, data: sc, msg: "Service case created" };
      }

      case "update_service_case": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.resolution !== undefined) d.resolution = args.resolution;
        const sc = await prisma.serviceCase.update({ where: { id: args.case_id }, data: d });
        return { ok: true, data: sc, msg: "Service case updated" };
      }

      case "create_defect_record": {
        const dr = await prisma.defectRecord.create({ data: { description: args.description, severity: args.severity, productionOrderId: args.productionOrderId || null, serviceCaseId: args.serviceCaseId || null, createdById: user.id } });
        return { ok: true, data: dr, msg: "Defect recorded: " + dr.severity };
      }

      case "create_rent_contract": {
        const rc = await prisma.rentContract.create({
          data: { contractNumber: "RENT-" + Date.now(), clientId: args.client_id, dealId: args.deal_id || null, startDate: new Date(args.startDate), endDate: args.endDate ? new Date(args.endDate) : null, monthlyPayment: args.monthlyPayment ? +args.monthlyPayment : null, billingFormula: args.billingFormula || "{}", status: "Active" },
        });
        return { ok: true, data: rc, msg: "Rent contract created: " + rc.contractNumber };
      }

      case "update_rent_contract": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.monthlyPayment !== undefined) d.monthlyPayment = +args.monthlyPayment;
        if (args.endDate) d.endDate = new Date(args.endDate);
        const rc = await prisma.rentContract.update({ where: { id: args.contract_id }, data: d });
        return { ok: true, data: rc, msg: "Rent contract updated" };
      }

      case "create_billing_record": {
        const br = await prisma.billingRecord.create({ data: { rentContractId: args.rentContractId, period: args.period, amount: +args.amount, energyProduced: args.energyProduced ? +args.energyProduced : null, dataSource: "manual", status: args.status || "Pending", formulaSnapshot: "{}" } });
        return { ok: true, data: br, msg: "Billing record created for " + args.period };
      }

      case "update_supplier": {
        const d: any = {};
        ["name","contactPerson","phone","email","address"].forEach(k => { if (args[k] !== undefined) d[k] = args[k]; });
        const s = await prisma.supplier.update({ where: { id: args.supplier_id }, data: d });
        return { ok: true, data: s, msg: "Supplier updated" };
      }

      case "create_purchase_request": {
        const prr = await prisma.purchaseRequest.create({ data: { productId: args.productId, quantity: +args.quantity, dealId: args.deal_id || null, supplierId: args.supplierId || null, status: "New", createdById: user.id } });
        return { ok: true, data: prr, msg: "Purchase request created" };
      }

      case "update_purchase_request": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.quantity !== undefined) d.quantity = +args.quantity;
        const prr = await prisma.purchaseRequest.update({ where: { id: args.request_id }, data: d });
        return { ok: true, data: prr, msg: "Purchase request updated" };
      }

      case "create_supplier_order": {
        const so = await prisma.supplierOrder.create({ data: { supplierId: args.supplierId, orderNumber: "SO-" + Date.now(), status: "New", totalAmount: args.totalAmount ? +args.totalAmount : null, expectedDate: args.expectedDate ? new Date(args.expectedDate) : null, createdById: user.id } });
        return { ok: true, data: so, msg: "Supplier order created: " + so.orderNumber };
      }

      case "update_supplier_order": {
        const so = await prisma.supplierOrder.update({ where: { id: args.order_id }, data: { status: args.status } });
        return { ok: true, data: so, msg: "Supplier order -> " + args.status };
      }

      case "create_client_action": {
        const maxOrder = await prisma.clientAction.findFirst({ where: { clientId: args.client_id }, orderBy: { orderIndex: "desc" }, select: { orderIndex: true } });
        const act = await prisma.clientAction.create({ data: { clientId: args.client_id, type: args.type, title: args.title, description: args.description || "", status: args.status || "Pending", orderIndex: (maxOrder?.orderIndex || 0) + 1, createdById: user.id } });
        return { ok: true, data: act, msg: "Client action created: " + act.title };
      }

      case "update_client_action": {
        const d: any = {};
        if (args.status) d.status = args.status;
        if (args.title !== undefined) d.title = args.title;
        if (args.description !== undefined) d.description = args.description;
        if (args.orderIndex !== undefined) d.orderIndex = +args.orderIndex;
        if (args.status === "Completed") d.completedAt = new Date();
        const act = await prisma.clientAction.update({ where: { id: args.action_id }, data: d });
        return { ok: true, data: act, msg: "Client action updated" };
      }

      case "create_action_message": {
        const m = await prisma.actionMessage.create({ data: { actionId: args.action_id, senderId: user.id, content: args.content } });
        return { ok: true, data: m, msg: "Message added to action" };
      }

      case "create_telemetry_device": {
        const td = await prisma.telemetryDevice.create({ data: { serialNumber: args.serialNumber, model: args.model || null, nominalCapacity: args.nominalCapacity ? +args.nominalCapacity : null } });
        return { ok: true, data: td, msg: "Device registered: " + td.serialNumber };
      }

      case "create_telemetry_reading": {
        const tr = await prisma.telemetryReading.create({ data: { deviceId: args.deviceId, clientId: args.clientId || null, measurementPeriod: args.measurementPeriod, energyProduced: args.energyProduced ? +args.energyProduced : null, uptime: args.uptime ? +args.uptime : null, dataSource: "manual", verificationStatus: "Unverified" } });
        return { ok: true, data: tr, msg: "Reading recorded for " + args.measurementPeriod };
      }

      case "create_agent_commission": {
        const ac = await prisma.agentCommissionRecord.create({ data: { agentId: args.agentId, dealId: args.dealId, amount: +args.amount, status: args.status || "Pending" } });
        return { ok: true, data: ac, msg: "Commission created" };
      }

      case "create_tariff_rate": {
        if (!isDirector(user)) return { ok: false, msg: "Only Directors can manage tariff rates" };
        const role = await prisma.role.findFirst({ where: { name: args.roleName } });
        if (!role) return { ok: false, msg: "Role not found: " + args.roleName };
        const tr = await prisma.tariffRate.create({ data: { roleId: role.id, taskType: args.taskType, ratePerUnit: +args.ratePerUnit, unit: args.unit } });
        return { ok: true, data: tr, msg: "Tariff rate created" };
      }

      case "create_integration_log": {
        const il = await prisma.integrationLog.create({ data: { direction: args.direction, system: args.system, entityType: args.entityType || null, entityId: args.entityId || null, status: args.status, request: args.request || null, response: args.response || null, createdById: user.id } });
        return { ok: true, data: il, msg: "Integration log created" };
      }

      case "create_product_item": {
        const pi = await prisma.productItem.create({ data: { productId: args.productId, serialNumber: args.serialNumber, status: args.status || "InStock", warehouseCellId: args.warehouseCellId || null } });
        return { ok: true, data: pi, msg: "Product item created: " + pi.serialNumber };
      }

      case "create_inventory_balance": {
        const ib = await prisma.inventoryBalance.create({ data: { productId: args.productId, quantity: +args.quantity, cellId: args.cellId || null } });
        return { ok: true, data: ib, msg: "Inventory balance set" };
      }

      case "create_reserve": {
        const r = await prisma.reserve.create({ data: { productItemId: args.productItemId, dealId: args.dealId, quantity: +args.quantity, status: "Active", createdById: user.id } });
        await prisma.productItem.update({ where: { id: args.productItemId }, data: { status: "Reserved" } });
        return { ok: true, data: r, msg: "Reserve created" };
      }

      case "create_specification": {
        const sp = await prisma.specification.create({ data: { name: args.name } });
        return { ok: true, data: sp, msg: "Specification created: " + sp.name };
      }

      case "archive_supplier": {
        await prisma.supplier.update({ where: { id: args.supplier_id }, data: { isArchived: true } });
        return { ok: true, data: null, msg: "Supplier archived" };
      }


      case "crud": {
        const modelKey = toModelKey(args.entity);
        const model = (prisma as any)[modelKey];
        if (!model) return { ok: false, msg: "Unknown entity: " + args.entity + " (tried key: " + modelKey + ")" };
        switch (args.action) {
          case "list": {
            const filter: any = args.filters || {};
            if (typeof filter.isArchived === "undefined") filter.isArchived = false;
            const r = await model.findMany({ where: filter, take: args.limit || 20, orderBy: { createdAt: "desc" } });
            return { ok: true, data: r, msg: r.length + " records" };
          }
          case "get": {
            if (!args.id) return { ok: false, msg: "id required for get action" };
            const r = await model.findUnique({ where: { id: args.id } });
            if (!r) return { ok: false, msg: "Record not found" };
            return { ok: true, data: r, msg: "Record found" };
          }
          case "create": {
            if (!args.data) return { ok: false, msg: "data required for create action" };
            const r = await model.create({ data: args.data });
            return { ok: true, data: r, msg: "Record created" };
          }
          case "update": {
            if (!args.id) return { ok: false, msg: "id required for update action" };
            if (!args.data) return { ok: false, msg: "data required for update action" };
            const r = await model.update({ where: { id: args.id }, data: args.data });
            return { ok: true, data: r, msg: "Record updated" };
          }
          case "delete": {
            if (!args.id) return { ok: false, msg: "id required for delete action" };
            const r = await model.update({ where: { id: args.id }, data: { isArchived: true } });
            return { ok: true, data: r, msg: "Record archived" };
          }
          default:
            return { ok: false, msg: "Unknown action: " + args.action };
        }
      }

      default: {
        // Auto-route: create_xxx -> crud(create), list_xxx -> crud(list), etc.
        const patterns: Array<{ regex: RegExp; action: string }> = [
          { regex: /^create_(.+)/, action: "create" },
          { regex: /^update_(.+)/, action: "update" },
          { regex: /^list_(.+)/, action: "list" },
          { regex: /^get_(.+)/, action: "get" },
          { regex: /^archive_(.+)/, action: "delete" },
        ];
        for (const p of patterns) {
          const m = name.match(p.regex);
          if (m) {
            const raw = m[1].replace(/_id$/, "");
            const entity = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
            return executeTool("crud", { entity, action: p.action, ...args }, user, isAdmin);
          }
        }
        return { ok: false, msg: "Unknown tool: " + name + ". Available: all 104 tools in ALL_TOOLS" };
      }
    }
  } catch (err: any) {
    console.error("Tool error:", name, err);
    return { ok: false, msg: "Error: " + (err.message || "Unknown") };
  }
}

export { isDirector };
