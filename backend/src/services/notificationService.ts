import { prisma } from "../index";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message?: string;
  entityType: string;
  entityId?: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        entityType: params.entityType,
        entityId: params.entityId || null,
        link: params.link || null,
      },
    });
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
