import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Server as SocketIOServer } from "socket.io";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { initializeScheduledTasks } from "./services/scheduler";
import { setupTelemetrySocket } from "./services/telemetrySocket";

import clientRoutes from "./routes/clientRoutes";
import leadRoutes from "./routes/leadRoutes";
import dealRoutes from "./routes/dealRoutes";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import warehouseRoutes from "./routes/warehouseRoutes";
import productionRoutes from "./routes/productionRoutes";
import procurementRoutes from "./routes/procurementRoutes";
import installationRoutes from "./routes/installationRoutes";
import rentRoutes from "./routes/rentRoutes";
import legalRoutes from "./routes/legalRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import telemetryRoutes from "./routes/telemetryRoutes";
import taskRoutes from "./routes/taskRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import auditRoutes from "./routes/auditRoutes";
import roleRoutes from "./routes/roleRoutes";
import chatRoutes from "./routes/chatRoutes";

dotenv.config();

export const prisma = new PrismaClient();

async function ensureAdminUser() {
  const adminExists = await prisma.user.findFirst({
    where: { email: "director@12m.ru" },
  });

  if (!adminExists) {
    console.log("No admin user found. Run seed first: npx ts-node src/seed.ts");
  }
}

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
  path: "/ws",
});
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/auth", userRoutes);
app.use("/api/clients", authMiddleware, clientRoutes);
app.use("/api/leads", authMiddleware, leadRoutes);
app.use("/api/deals", authMiddleware, dealRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/warehouse", authMiddleware, warehouseRoutes);
app.use("/api/production", authMiddleware, productionRoutes);
app.use("/api/procurement", authMiddleware, procurementRoutes);
app.use("/api/installation", authMiddleware, installationRoutes);
app.use("/api/rent", authMiddleware, rentRoutes);
app.use("/api/legal", authMiddleware, legalRoutes);
app.use("/api/invoices", authMiddleware, invoiceRoutes);
app.use("/api/payments", authMiddleware, paymentRoutes);
app.use("/api/service", authMiddleware, serviceRoutes);
app.use("/api/telemetry", authMiddleware, telemetryRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/integrations", authMiddleware, integrationRoutes);
app.use("/api/audit", authMiddleware, auditRoutes);
app.use("/api/roles", authMiddleware, roleRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to database");

    await ensureAdminUser();
    initializeScheduledTasks();
    setupTelemetrySocket(io);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`12M CRM Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
