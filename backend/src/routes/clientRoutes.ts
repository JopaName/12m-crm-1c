import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ClientService } from "../services/ClientService";
import { createClientSchema, updateClientSchema } from "../validators";

const router = Router();
const service = new ClientService();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(clients);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch clients" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const client = await service.getFullProfile(req.params.id, req.user!.id);
    res.json(client);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch client" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createClientSchema.parse(req.body);
    const client = await service.create(data, req.user!.id);
    res.status(201).json(client);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    if (e.code === "P2002") return res.status(409).json({ error: "Client with this INN already exists" });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create client" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateClientSchema.parse(req.body);
    const client = await service.update(req.params.id, data, req.user!.id);
    res.json(client);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update client" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== "Director" && req.user!.roleName !== "Owner") {
      return res.status(403).json({ error: "Only Director can delete clients" });
    }
    await service.archive(req.params.id, req.user!.id);
    res.json({ message: "Client archived" });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to archive client" });
  }
});

export default router;