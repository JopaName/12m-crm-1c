import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import http from "http";
import { config } from "./config";
import { authLimiter, apiLimiter } from "./middleware/rateLimiter";
import dotenv from "dotenv";
import { prisma } from "./db";
export { prisma };
import bcrypt from "bcryptjs";
import { Server as SocketIOServer } from "socket.io";
import { authMiddleware } from "./middleware/auth";
import { initializeScheduledTasks } from "./services/scheduler";
import { setupTelemetrySocket } from "./services/telemetrySocket";
import clientRoutes from "./routes/clientRoutes";
import clientActionRoutes from "./routes/clientActionRoutes";
import dealRoutes from "./routes/dealRoutes";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import warehouseRoutes from "./routes/warehouseRoutes";
import aiCoordinatorRoutes from "./routes/aiCoordinatorRoutes";
import productionRoutes from "./routes/productionRoutes";
import procurementRoutes from "./routes/procurementRoutes";
import logRoutes from "./routes/logRoutes";
import { errorHandler, logError } from "./utils/logger";
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
import notificationRoutes from "./routes/notificationRoutes";
import fileRoutes from "./routes/fileRoutes";
import crudRoutes from "./routes/crudRoutes";
import { FILE_LIMITS } from "./utils/fileUtils";
dotenv.config();
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
  cors: { origin: config.cors.origin },
  path: "/ws",
});
const PORT = config.port;
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({ origin: config.cors.origin }));
app.set("trust proxy", 1);
app.use(morgan("dev"));

app.use("/api", apiLimiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(function(_req, res, next) { res.setHeader("Content-Security-Policy", "default-src 'self'; frame-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"); next(); });
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }));

// Auto-log all 500 errors from any route
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 500) {
      const msg = typeof body === "object" && body?.error ? body.error : "Internal server error";
      logError(msg, {
        source: "express",
        url: _req.originalUrl,
        userId: (_req as any)?.user?.id,
        metadata: { method: _req.method, statusCode: res.statusCode, body },
      }).catch(() => {});
    }
    return originalJson(body);
  } as typeof res.json;
  next();
});

app.use("/api/auth", userRoutes);
app.use("/api/clients", authMiddleware, clientRoutes);
app.use("/api/clients", authMiddleware, clientActionRoutes);
app.use("/api/deals", authMiddleware, dealRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/warehouse", authMiddleware, warehouseRoutes);
app.use("/api/ai", authMiddleware, aiCoordinatorRoutes);
app.use("/api/production", authMiddleware, productionRoutes);
app.use("/api/procurement", authMiddleware, procurementRoutes);
app.use("/api/logs", authMiddleware, logRoutes);
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
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/files", authMiddleware, fileRoutes);
app.get("/api/reference", (_req, res) => {
  const fs = require("fs");
  const docs = JSON.parse(fs.readFileSync(__dirname + "/docs.json", "utf-8"));
  res.json(docs);
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", authMiddleware, crudRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
// Log unhandled errors globally
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  logError(err.message, { stack: err.stack, source: "uncaught" });
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  logError(String(reason), { source: "unhandled" });
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
