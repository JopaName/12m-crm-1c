import cron from "node-cron";
import {
  syncWith1C,
  syncFinanceTable,
  pollTelemetry,
  calculateMonthlyBilling,
} from "../integrations/syncServices";

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

  console.log("Scheduled tasks initialized");
}
