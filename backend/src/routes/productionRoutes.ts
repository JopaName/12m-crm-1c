import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { autoCalculateProductionCost } from "../services/salaryService";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.productionOrder.findMany({
      where: { isArchived: false },
      include: {
        deal: { include: { client: true, responsibleAgent: true } },
        productionRoute: {
          include: { steps: { orderBy: { orderIndex: "asc" } } },
        },
        defectRecords: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch production orders" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.productionOrder.create({
      data: {
        dealId: req.body.dealId,
        productionRouteId: req.body.productionRouteId || null,
        status: "New",
      },
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to create production order" });
  }
});

router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    if (req.body.status === "Completed") {
      await autoCalculateProductionCost(req.params.id);
    }

    const updated = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
      include: { productionRoute: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update production order" });
  }
});

router.get("/routes", async (_req: AuthRequest, res: Response) => {
  const routes = await prisma.productionRoute.findMany({
    where: { isArchived: false },
  });
  res.json(routes);
});

export default router;
