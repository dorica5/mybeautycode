import { prisma } from "../lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { professionService } from "./professionService";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPABASE_URL = process.env.SUPABASE_URL;

/** UI / legacy strings → `professions.code` (e.g. merged brows + lashes). */
function normalizeProfessionCodeForInspiration(
  code: string | undefined
): string {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "hair";
  if (c === "brows" || c === "lashes") return "brows_lashes";
  return c;
}

function normalizeInspirationPathInput(url: string): string {
  const raw = String(url ?? "")
    .trim()
    .split("?")[0];
  if (!raw) return "";
  if (raw.includes("/inspirations/")) {
    const p = raw.split("/inspirations/")[1];
    return decodeURIComponent(p?.split("?")[0] ?? "") || raw;
  }
  if (raw.includes("/")) {
    return raw;
  }
  return raw.split("/").pop() ?? raw;
}

/** DB may store `owner/uuid.jpg`; client may send basename only — expand for lookup. */
function expandStorageLookupKeys(paths: string[]): string[] {
  const s = new Set<string>();
  for (const raw of paths) {
    const n = normalizeInspirationPathInput(raw);
    if (!n) continue;
    s.add(n);
    const base = n.includes("/") ? n.split("/").pop() : n;
    if (base) s.add(base);
  }
  return [...s];
}

export const inspirationService = {
  async listByOwner(ownerId: string, professionCode?: string) {
    const professionId = await professionService.getProfessionIdByCode(
      normalizeProfessionCodeForInspiration(professionCode)
    );
    const results = await prisma.inspiration.findMany({
      where: { ownerId, professionId },
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
    profession_id?: string;
    profession_code?: string;
    image_url: string;
    low_res_image_url?: string;
    low_middle_res_url?: string;
    high_middle_res_url?: string;
  }) {
    const ownerId = data.owner_id ?? data.client_id;
    if (!ownerId) throw new Error("owner_id or client_id required");

    const codeRaw =
      typeof data.profession_code === "string"
        ? data.profession_code.trim().toLowerCase()
        : "";
    const professionId = data.profession_id
      ? data.profession_id
      : await professionService.getProfessionIdByCode(
          normalizeProfessionCodeForInspiration(codeRaw || "hair")
        );

    return prisma.inspiration.create({
      data: {
        ownerId,
        professionId,
        imageUrl: data.image_url,
        lowResImageUrl: data.low_res_image_url,
        lowMiddleResUrl: data.low_middle_res_url,
        highMiddleResUrl: data.high_middle_res_url,
      },
    });
  },

  /**
   * Deletes inspiration rows owned by `ownerId` and removes the corresponding storage objects.
   * Prefer `ids` when the client has DB row ids; fall back to `imageUrls` for batch path deletes.
   * Returns how many rows were deleted (0 if nothing matched).
   */
  async deleteForOwner(
    ownerId: string,
    opts: { ids?: string[]; imageUrls?: string[] }
  ): Promise<number> {
    const idList = [...new Set((opts.ids ?? []).map((id) => String(id).trim()).filter(Boolean))];
    let toDelete =
      idList.length > 0
        ? await prisma.inspiration.findMany({
            where: { ownerId, id: { in: idList } },
          })
        : [];

    if (toDelete.length === 0 && opts.imageUrls?.length) {
      const keys = expandStorageLookupKeys(opts.imageUrls);
      if (keys.length > 0) {
        toDelete = await prisma.inspiration.findMany({
          where: {
            ownerId,
            OR: [
              { imageUrl: { in: keys } },
              { lowResImageUrl: { in: keys } },
            ],
          },
        });
      }
    }

    if (toDelete.length === 0) return 0;

    await prisma.inspiration.deleteMany({
      where: { id: { in: toDelete.map((d) => d.id) } },
    });

    const objectPaths = new Set<string>();
    for (const row of toDelete) {
      for (const col of [
        row.imageUrl,
        row.lowResImageUrl,
        row.lowMiddleResUrl,
        row.highMiddleResUrl,
      ]) {
        const p = col && String(col).trim();
        if (p) objectPaths.add(p);
      }
    }
    const storageList = [...objectPaths];
    if (storageList.length > 0) {
      await supabase.storage.from("inspirations").remove(storageList);
    }

    return toDelete.length;
  },

  /** @deprecated Use deleteForOwner — kept for any legacy callers. */
  async deleteByImageUrls(ownerId: string, imageUrls: string[]) {
    return this.deleteForOwner(ownerId, { imageUrls });
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
