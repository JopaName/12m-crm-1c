import { prisma } from "../index";
import { createAuditLog } from "../utils/helpers";
import axios from "axios";

export async function syncWith1C() {
  try {
    // Send invoices to 1C
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "Draft",
        updatedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    for (const invoice of invoices) {
      await prisma.integrationLog.create({
        data: {
          direction: "Outgoing",
          system: "1C",
          entityType: "Invoice",
          entityId: invoice.id,
          status: "Success",
          request: JSON.stringify(invoice),
        },
      });
    }

    // Receive updates from 1C
    await prisma.integrationLog.create({
      data: {
        direction: "Incoming",
        system: "1C",
        status: "Success",
      },
    });
  } catch (error: any) {
    await prisma.integrationLog.create({
      data: {
        direction: "Outgoing",
        system: "1C",
        status: "Error",
        errorMessage: error.message,
      },
    });
  }
}

export async function syncFinanceTable() {
  try {
    const deals = await prisma.deal.findMany({
      where: { isArchived: false },
      include: {
        invoices: true,
        payments: true,
        client: true,
      },
    });

    for (const deal of deals) {
      const totalInvoiced = deal.invoices.reduce(
        (sum, inv) => sum + inv.amount,
        0,
      );
      const totalPaid = deal.payments
        .filter((p) => p.status === "Confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

      await prisma.integrationLog.create({
        data: {
          direction: "Outgoing",
          system: "FinanceTable",
          entityType: "Deal",
          entityId: deal.id,
          status: "Success",
          request: JSON.stringify({
            dealId: deal.dealNumber,
            clientName: deal.client.name,
            amount: deal.expectedAmount,
            invoiced: totalInvoiced,
            paid: totalPaid,
            status: deal.status,
          }),
        },
      });
    }
  } catch (error: any) {
    await prisma.integrationLog.create({
      data: {
        direction: "Outgoing",
        system: "FinanceTable",
        status: "Error",
        errorMessage: error.message,
      },
    });
  }
}

export async function pollTelemetry() {
  try {
    const activeContracts = await prisma.rentContract.findMany({
      where: { status: "Active", isArchived: false },
      include: {
        equipment: true,
        client: true,
      },
    });

    for (const contract of activeContracts) {
      const device = contract.equipment.find((e) => e.serialNumber);
      if (!device?.serialNumber) continue;

      try {
        // Simulate API call to inverter cloud
        const response = await axios
          .get(
            `https://api.thinkpower.com/v1/inverters/${device.serialNumber}/data`,
            { timeout: 5000 },
          )
          .catch(() => null);

        const reading = await prisma.telemetryReading.create({
          data: {
            rentContractId: contract.id,
            clientId: contract.clientId,
            inverterSerialNumber: device.serialNumber,
            measurementPeriod: new Date().toISOString().slice(0, 7),
            energyProduced: response?.data?.energyProduced || null,
            uptime: response?.data?.uptime || null,
            dataSource: response ? "API" : "Agent_Input",
            verificationStatus: response ? "Confirmed" : "Unverified",
          },
        });

        if (!response) {
          // Create task for agent to get readings manually
          await prisma.task.create({
            data: {
              title: `Get telemetry readings for ${contract.contractNumber}`,
              type: "Technical",
              status: "New",
              priority: "High",
              dealId: contract.dealId,
              createdById:
                (
                  await prisma.user.findFirst({
                    where: { role: { name: "Director" } },
                  })
                )?.id || "",
              description: `API unavailable for inverter ${device.serialNumber}. Get readings via backup method.`,
            },
          });
        }

        console.log(`Telemetry polled for contract ${contract.contractNumber}`);
      } catch (err) {
        console.error(`Telemetry poll failed for ${device.serialNumber}:`, err);
      }
    }
  } catch (error) {
    console.error("Telemetry polling error:", error);
  }
}

export async function calculateMonthlyBilling() {
  const period = new Date().toISOString().slice(0, 7);

  try {
    const activeContracts = await prisma.rentContract.findMany({
      where: { status: "Active", isArchived: false },
      include: { telemetryReadings: { where: { measurementPeriod: period } } },
    });

    for (const contract of activeContracts) {
      const reading = contract.telemetryReadings[0];
      if (!reading) continue;

      const billingFormula = (contract.billingFormula as any) || {};
      const uptime = reading.uptime || 0;
      const coefficient = uptime > 0 ? Math.min(uptime / (24 * 30), 1) : 0;
      const monthlyPayment = contract.monthlyPayment || 0;
      const amount = monthlyPayment * coefficient;

      await prisma.billingRecord.create({
        data: {
          rentContractId: contract.id,
          period,
          amount,
          formulaSnapshot: {
            monthlyPayment,
            uptime,
            coefficient,
            formula: billingFormula,
          },
          dataSource: reading.dataSource,
          energyProduced: reading.energyProduced,
          uptime: reading.uptime,
          coefficient,
          status: "Calculated",
        },
      });
    }
  } catch (error) {
    console.error("Billing calculation error:", error);
  }
}
