import { api } from "@/src/lib/apiClient";

export type PublicProfileWorkRow = {
  id: string;
  imageUrl: string;
  lowResImageUrl: string | null;
  professionCode: string;
  sortOrder: number;
  createdAt: string;
};

const BUCKET = "public_profile_work";

export function publicProfileWorkBucket(): string {
  return BUCKET;
}

function normalizeWorkRow(raw: unknown): PublicProfileWorkRow {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    imageUrl: String(r.imageUrl ?? r.image_url ?? ""),
    lowResImageUrl:
      (r.lowResImageUrl ?? r.low_res_image_url) != null
        ? String(r.lowResImageUrl ?? r.low_res_image_url)
        : null,
    professionCode: String(r.professionCode ?? r.profession_code ?? "hair"),
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    createdAt: String(r.createdAt ?? r.created_at ?? ""),
  };
}

export async function listPublicProfileWork(
  profileUserId: string,
  professionCode: string
): Promise<PublicProfileWorkRow[]> {
  const q = new URLSearchParams({ profession: professionCode.trim() || "hair" });
  const data = await api.get<unknown[]>(
    `/api/profiles/${encodeURIComponent(profileUserId)}/public-work-images?${q}`
  );
  return Array.isArray(data) ? data.map(normalizeWorkRow) : [];
}

export async function addPublicProfileWork(
  profileUserId: string,
  body: {
    profession_code: string;
    image_url: string;
    low_res_image_url?: string | null;
  }
): Promise<PublicProfileWorkRow> {
  return api.post<PublicProfileWorkRow>(
    `/api/profiles/${encodeURIComponent(profileUserId)}/public-work-images`,
    body
  );
}

export async function deletePublicProfileWork(
  profileUserId: string,
  imageId: string
): Promise<void> {
  await api.delete(
    `/api/profiles/${encodeURIComponent(profileUserId)}/public-work-images/${encodeURIComponent(imageId)}`
  );
}
