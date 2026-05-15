import { Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

export function createAuditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
    },
  });
}

export function rowLevelFilter(
  userRole: string,
  userId: string,
  tableAlias: string = "",
) {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  switch (userRole) {
    case "Agent":
      return { [`${prefix}responsibleAgentId`]: userId };
    case "AT_Engineer":
      return {
        [`${prefix}status`]: { in: ["AT_Engineering", "Project_Approval"] },
      };
    case "Accountant":
      return {}; // All deals, finances only
    case "Director":
    case "Owner":
      return {}; // Full access
    default:
      return {};
  }
}
