import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const DEFAULT_STAGES = [
  { key: "Lead_Created", label: "Лид", color: "blue" },
  { key: "Invoice_Generation", label: "Счёт", color: "amber" },
  { key: "Legal_Review", label: "Юристы", color: "purple" },
  { key: "Doc_Sending", label: "Доки", color: "indigo" },
  { key: "Waiting_Payment", label: "Оплата", color: "orange" },
  { key: "Paid_And_Reserved", label: "Резерв", color: "teal" },
  { key: "Issuing_Goods", label: "Отгрузка", color: "cyan" },
  { key: "Deal_Closed", label: "Закрыто", color: "emerald" },
];

router.get("/config", authMiddleware, asyncHandler(async (_req, res) => {
    let config = await prisma.pipelineConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!config) {
      config = await prisma.pipelineConfig.create({ data: { configJson: JSON.stringify(DEFAULT_STAGES) } });
    }
    const stages = JSON.parse(config.configJson);
    res.json({ stages });
}));

router.put("/config", authMiddleware, asyncHandler(async (req, res) => {
    const { stages } = req.body;
    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: "stages must be an array" });
    }
    let config = await prisma.pipelineConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (config) {
      config = await prisma.pipelineConfig.update({
        where: { id: config.id },
        data: { configJson: JSON.stringify(stages) },
      });
    } else {
      config = await prisma.pipelineConfig.create({ data: { configJson: JSON.stringify(stages) } });
    }
    res.json({ stages: JSON.parse(config.configJson) });
}));

export default router;
