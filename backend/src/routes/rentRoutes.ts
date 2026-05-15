import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const contracts = await prisma.rentContract.findMany({
      where: { isArchived: false },
      include: {
        client: true,
        equipment: { include: { product: true } },
        billingRecords: { orderBy: { period: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rent contracts" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { equipmentIds, ...data } = req.body;
    const contract = await prisma.rentContract.create({
      data: {
        ...data,
        contractNumber: `R-${Date.now()}`,
        status: "Active",
        equipment: {
          connect: equipmentIds?.map((id: string) => ({ id })) || [],
        },
      },
    });
    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ error: "Failed to create rent contract" });
  }
});

router.get("/billing", async (_req: AuthRequest, res: Response) => {
  try {
    const records = await prisma.billingRecord.findMany({
      orderBy: { period: "desc" },
      include: { rentContract: { include: { client: true } } },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch billing records" });
  }
});

export default router;
