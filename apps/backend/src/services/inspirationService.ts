import { prisma } from "../lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPABASE_URL = process.env.SUPABASE_URL;

export const inspirationService = {
  async listByOwner(ownerId: string) {
    const results = await prisma.inspiration.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return results.map((r) => ({
      ...r,
      image_url: r.imageUrl,
      low_res_image_url: r.lowResImageUrl,
      low_middle_res_url: r.lowMiddleResUrl,
      high_middle_res_url: r.highMiddleResUrl,
    }));
  },

  async create(data: {
    owner_id?: string;
    client_id?: string;
    shared_by?: string;
    image_url: string;
    low_res_image_url?: string;
    low_middle_res_url?: string;
    high_middle_res_url?: string;
  }) {
    return prisma.inspiration.create({
      data: {
        ownerId: data.owner_id ?? data.client_id,
        sharedBy: data.shared_by,
        imageUrl: data.image_url,
        lowResImageUrl: data.low_res_image_url,
        lowMiddleResUrl: data.low_middle_res_url,
        highMiddleResUrl: data.high_middle_res_url,
      },
    });
  },

  async deleteByImageUrls(ownerId: string, imageUrls: string[]) {
    const filenames = imageUrls.map((url) => {
      if (url.includes("/inspirations/")) {
        const p = url.split("/inspirations/")[1];
        return p?.split("?")[0] ?? url;
      }
      return url.split("/").pop()?.split("?")[0] ?? url;
    });
    const toDelete = await prisma.inspiration.findMany({
      where: {
        ownerId,
        imageUrl: { in: filenames },
      },
    });
    if (toDelete.length > 0) {
      await prisma.inspiration.deleteMany({
        where: { id: { in: toDelete.map((d) => d.id) } },
      });
    }
    await supabase.storage.from("inspirations").remove(filenames);
    for (const f of filenames) {
      const lowRes = f.replace("_high.jpg", "_low.jpg");
      await supabase.storage.from("inspirations").remove([lowRes]);
    }
  },

  getImageTransformUrl(bucket: string, path: string, width?: number, height?: number): string {
    if (!SUPABASE_URL) return "";
    if (!width && !height) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
    const url = new URL(
      `/storage/v1/render/image/public/${bucket}/${path}`,
      SUPABASE_URL
    );
    if (width) url.searchParams.set("width", String(width));
    if (height) url.searchParams.set("height", String(height));
    return url.toString();
  },
};
