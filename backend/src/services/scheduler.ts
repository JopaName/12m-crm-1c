import cron from "node-cron";
import {
  syncWith1C,
  syncFinanceTable,
  pollTelemetry,
  calculateMonthlyBilling,
} from "../integrations/syncServices";
import { calculateMonthlyAgentCommissions } from "./salaryService";

export function initializeScheduledTasks() {
  // Sync with 1C every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    console.log("[Cron] Syncing with 1C...");
    syncWith1C();
  });

  // Sync finance table every hour
  cron.schedule("0 * * * *", () => {
    console.log("[Cron] Syncing finance table...");
    syncFinanceTable();
  });

  // Poll telemetry every 60 minutes
  cron.schedule("0 * * * *", () => {
    console.log("[Cron] Polling telemetry...");
    pollTelemetry();
  });

  // Calculate monthly billing on the 1st of each month at 2 AM
  cron.schedule("0 2 1 * *", () => {
    console.log("[Cron] Calculating monthly billing...");
    calculateMonthlyBilling();
  });

  // Calculate monthly agent commissions on the 1st of each month at 3 AM
  cron.schedule("0 3 1 * *", async () => {
    console.log("[Cron] Calculating monthly agent commissions...");
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    await calculateMonthlyAgentCommissions(year, month);
  });

  console.log("Scheduled tasks initialized");
}
