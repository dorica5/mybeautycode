import { prisma } from "../lib/prisma";

export const supportService = {
  async create(
    userId: string,
    data: {
      subject?: string;
      message: string;
      status?: string;
      priority?: string;
    }
  ) {
    const status = (data.status ?? "open") as "open" | "in_progress" | "resolved" | "closed";
    const priority = data.priority as "low" | "medium" | "high" | "urgent" | undefined;
    return prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject,
        message: data.message,
        status,
        priority: priority ?? undefined,
      },
    });
  },
};
