import { prisma } from "../lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { storageService } from "./storageService";
import { inspirationService } from "./inspirationService";
import { professionService } from "./professionService";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHARED_INSPIRATION_BUCKET = "shared_inspiration_images";

function extractFilename(imageUrl: string): string {
  try {
    const path = new URL(imageUrl).pathname;
    return path.split("/").pop() ?? `${Date.now()}.png`;
  } catch {
    return imageUrl.split("/").pop() ?? `${Date.now()}.png`;
  }
}

export const sharedInspirationService = {
  async create(
    senderId: string,
    recipientId: string,
    batchId: string,
    items: { imageUrl: string }[],
    professionCode = "hair"
  ) {
    const professionId = await professionService.getProfessionIdByCode(professionCode);

    await prisma.sharedInspiration.createMany({
      data: items.map((item) => ({
        senderUserId: senderId,
        recipientUserId: recipientId,
        professionId,
        batchId,
        imageUrl: item.imageUrl,
      })),
    });
    return { success: true };
  },

  async listByBatch(batchId: string, recipientId: string) {
    const rows = await prisma.sharedInspiration.findMany({
      where: { batchId, recipientUserId: recipientId },
      select: { imageUrl: true },
    });
    return rows.map((r: { imageUrl: string | null }) => r.imageUrl).filter(Boolean) as string[];
  },

  async accept(recipientId: string, batchId: string, imageUrls: string[]) {
    const successUrls: string[] = [];
    for (const imageUrl of imageUrls) {
      try {
        let buffer: Buffer;
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          const res = await fetch(imageUrl);
          if (!res.ok) continue;
          buffer = Buffer.from(await res.arrayBuffer());
        } else {
          const safePath = imageUrl.trim();
          if (!safePath || safePath.includes("..")) continue;
          const { data, error } = await supabase.storage
            .from(SHARED_INSPIRATION_BUCKET)
            .download(safePath);
          if (error || !data) continue;
          buffer = Buffer.from(await data.arrayBuffer());
        }
        const filename = extractFilename(imageUrl);
        await storageService.upload("inspirations", filename, buffer, "image/png");
        await inspirationService.create({
          owner_id: recipientId,
          image_url: filename,
        });
        await prisma.sharedInspiration.deleteMany({
          where: {
            imageUrl,
            recipientUserId: recipientId,
            batchId,
          },
        });
        successUrls.push(imageUrl);
      } catch (err) {
        console.error("Accept shared inspiration error:", err);
      }
    }
    return { success: true, accepted: successUrls.length };
  },

  async reject(recipientId: string, imageUrls: string[]) {
    await prisma.sharedInspiration.deleteMany({
      where: {
        recipientUserId: recipientId,
        imageUrl: { in: imageUrls },
      },
    });
    return { success: true };
  },
};
