import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { createAuditLog } from "../utils/helpers";

const router = Router();

// Get all actions for a client
router.get("/:clientId/actions", async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.clientAction.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { orderIndex: "asc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

// Create a new action
router.post("/:clientId/actions", async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, status } = req.body;
    const clientId = req.params.clientId;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const maxOrder = await prisma.clientAction.aggregate({
      where: { clientId },
      _max: { orderIndex: true },
    });

    const action = await prisma.clientAction.create({
      data: {
        clientId,
        type,
        title,
        description,
        status: status || "PLAN",
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: action.id,
      action: "CREATE",
      userId: req.user!.id,
      newValue: action,
    });

    res.status(201).json(action);
  } catch (error) {
    res.status(500).json({ error: "Failed to create action" });
  }
});

// Update an action
router.put("/:clientId/actions/:actionId", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.clientAction.findUnique({ where: { id: req.params.actionId } });
    if (!old) return res.status(404).json({ error: "Action not found" });

    const { type, title, description, status, orderIndex } = req.body;
    const data: any = {};
    if (type !== undefined) data.type = type;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (orderIndex !== undefined) data.orderIndex = orderIndex;
    if (status === "COMPLETED") data.completedAt = new Date();
    if (old.status === "COMPLETED" && status !== "COMPLETED") data.completedAt = null;

    const action = await prisma.clientAction.update({
      where: { id: req.params.actionId },
      data,
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: action.id,
      action: "UPDATE",
      userId: req.user!.id,
      oldValue: old,
      newValue: action,
    });

    res.json(action);
  } catch (error) {
    res.status(500).json({ error: "Failed to update action" });
  }
});

// Delete an action
router.delete("/:clientId/actions/:actionId", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.clientAction.findUnique({ where: { id: req.params.actionId } });
    if (!old) return res.status(404).json({ error: "Action not found" });

    await prisma.clientAction.delete({ where: { id: req.params.actionId } });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: req.params.actionId,
      action: "DELETE",
      userId: req.user!.id,
      oldValue: old,
    });

    res.json({ message: "Action deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete action" });
  }
});

// Reorder actions
router.put("/:clientId/actions/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        prisma.clientAction.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    const actions = await prisma.clientAction.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { orderIndex: "asc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder actions" });
  }
});

export default router;
