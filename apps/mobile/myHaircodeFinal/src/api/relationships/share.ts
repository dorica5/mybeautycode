import { api } from "@/src/lib/apiClient";

export async function fetchRecentProfiles(
  profileId: string,
  userType: string
): Promise<{ id: string; full_name: string; avatar_url: string; lastInteraction?: string }[]> {
  if (userType === "CLIENT") {
    const data = await api.get<{ id: string; fullName: string; avatarUrl: string; lastInteraction?: string }[]>(
      `/api/relationships?client_id=${encodeURIComponent(profileId)}`
    );
    const arr = Array.isArray(data) ? data : [];
    return arr
      .map((p) => ({
        id: p.id,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
        lastInteraction: p.lastInteraction,
      }))
      .sort((a, b) => {
        const da = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
        const db = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);
  } else {
    const data = await api.get<{ id: string; full_name: string; avatar_url: string; lastInteraction?: string }[]>(
      `/api/relationships/hairdresser?hairdresser_id=${encodeURIComponent(profileId)}`
    );
    const arr = Array.isArray(data) ? data : [];
    return arr
      .sort((a, b) => {
        const da = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
        const db = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);
  }
}

export async function searchShareProfiles(
  profileId: string,
  userType: string,
  query: string
): Promise<{ id: string; full_name: string; avatar_url: string }[]> {
  if (!query.trim()) return [];
  if (userType === "CLIENT") {
    const data = await api.get<{ id: string; fullName: string; avatarUrl: string }[]>(
      `/api/profiles/search/hairdressers-with-relationship?q=${encodeURIComponent(query)}`
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      avatar_url: p.avatarUrl,
    }));
  } else {
    const data = await api.get<{ id: string; fullName: string; avatarUrl: string }[]>(
      `/api/profiles/search/clients-with-relationship?q=${encodeURIComponent(query)}`
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      avatar_url: p.avatarUrl,
    }));
  }
}
