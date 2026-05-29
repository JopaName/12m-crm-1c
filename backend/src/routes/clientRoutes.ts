import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { createAuditLog, rowLevelFilter } from "../utils/helpers";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const filter = rowLevelFilter(req.user!.roleName, req.user!.id);
    const clients = await prisma.client.findMany({
      where: { ...filter, isArchived: false },
      include: {
        leads: true,
        deals: true,
        rentContracts: true,
        invoices: { take: 5, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        leads: { orderBy: { createdAt: "desc" } },
        deals: {
          include: {
            project: true,
            rentContract: true,
            invoices: true,
            installationTasks: true,
          },
          orderBy: { createdAt: "desc" },
        },
        rentContracts: { orderBy: { createdAt: "desc" } },
        legalDocuments: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        serviceCases: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await createAuditLog({
      entityType: "Client",
      entityId: client.id,
      action: "VIEW",
      userId: req.user!.id,
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      phone,
      email,
      inn,
      kpp,
      ogrn,
      legalAddress,
      actualAddress,
      contactPerson,
      notes,
    } = req.body;
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        inn,
        kpp,
        ogrn,
        legalAddress,
        actualAddress,
        contactPerson,
        notes,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      entityType: "Client",
      entityId: client.id,
      action: "CREATE",
      userId: req.user!.id,
      newValue: client,
    });

    res.status(201).json(client);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Client with this INN already exists" });
    }
    res.status(500).json({ error: "Failed to create client" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.client.findUnique({
      where: { id: req.params.id },
    });
    if (!old) return res.status(404).json({ error: "Client not found" });

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createAuditLog({
      entityType: "Client",
      entityId: client.id,
      action: "UPDATE",
      userId: req.user!.id,
      oldValue: old,
      newValue: client,
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: "Failed to update client" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== "Director" && req.user!.roleName !== "Owner") {
      return res
        .status(403)
        .json({ error: "Only Director can delete clients" });
    }
    await prisma.client.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });

    await createAuditLog({
      entityType: "Client",
      entityId: req.params.id,
      action: "ARCHIVE",
      userId: req.user!.id,
    });

    res.json({ message: "Client archived" });
  } catch (error) {
    res.status(500).json({ error: "Failed to archive client" });
  }
});

export default router;
