import cron from "node-cron";
import {
  syncWith1C,
  syncFinanceTable,
  pollTelemetry,
  calculateMonthlyBilling,
} from "../integrations/syncServices";
import { calculateMonthlyAgentCommissions } from "./salaryService";
import { FileService } from "./FileService";

const fileService = new FileService();

export function initializeScheduledTasks() {
  cron.schedule("*/5 * * * *", () => {
    console.log("[Cron] Syncing with 1C...");
    syncWith1C();
  });

  cron.schedule("0 * * * *", () => {
    console.log("[Cron] Syncing finance table...");
    syncFinanceTable();
  });

  cron.schedule("0 * * * *", () => {
    console.log("[Cron] Polling telemetry...");
    pollTelemetry();
  });

  cron.schedule("0 2 1 * *", () => {
    console.log("[Cron] Calculating monthly billing...");
    calculateMonthlyBilling();
  });

  cron.schedule("0 3 1 * *", async () => {
    console.log("[Cron] Calculating monthly agent commissions...");
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    await calculateMonthlyAgentCommissions(year, month);
  });

  cron.schedule("0 4 * * *", async () => {
    console.log("[Cron] Cleaning up orphaned files...");
    try {
      const result = await fileService.cleanupOrphanedFiles();
      console.log("[Cron] Orphaned file cleanup complete:", result);
    } catch (err) {
      console.error("[Cron] Orphaned file cleanup failed:", err);
    }
  });

  console.log("Scheduled tasks initialized");
}
