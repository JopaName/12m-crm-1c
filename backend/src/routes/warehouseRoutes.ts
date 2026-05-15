import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const [movements, cells, balance] = await Promise.all([
      prisma.warehouseMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          productItem: { include: { product: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.warehouseCell.findMany({ where: { isArchived: false } }),
      prisma.inventoryBalance.findMany({ include: { product: true } }),
    ]);
    res.json({ movements, cells, balance });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch warehouse data" });
  }
});

router.post("/movement", async (req: AuthRequest, res: Response) => {
  try {
    const movement = await prisma.warehouseMovement.create({
      data: { ...req.body, createdById: req.user!.id },
    });
    res.status(201).json(movement);
  } catch (error) {
    res.status(500).json({ error: "Failed to create movement" });
  }
});

export default router;
