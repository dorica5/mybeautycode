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
    return prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject,
        message: data.message,
        status: data.status ?? "open",
        priority: data.priority,
      },
    });
  },
};
