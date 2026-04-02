import Constants from "expo-constants";
import { supabase } from "./supabase";

const API_URL =
  Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3000";

type GetSession = () => Promise<{ access_token?: string } | null>;

let getSessionFn: GetSession | null = null;
let on401Fn: (() => void | Promise<void>) | null = null;

export function setApiSessionGetter(fn: GetSession) {
  getSessionFn = fn;
}

export function setApiOn401(fn: () => void | Promise<void>) {
  on401Fn = fn;
}

/**
 * React runs nested `useEffect` before parent `useEffect`. `AuthProvider` can call
 * `/api/auth/*` before `_layout` registers `setApiSessionGetter`, so we always
 * fall back to Supabase for the bearer token.
 */
async function getBearerToken(): Promise<string | undefined> {
  if (getSessionFn) {
    const s = await getSessionFn();
    if (s?.access_token) return s.access_token;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = await getBearerToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (res.status === 401 && on401Fn) {
      try {
        await on401Fn();
      } catch (e) {
        console.warn("Error in 401 handler:", e);
      }
    }
    const msg =
      typeof (data as { error?: string })?.error === "string"
        ? (data as { error: string }).error
        : res.statusText || "Request failed";
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data;
}

export const api = {
  async get<T = unknown>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, { headers });
    return handleResponse(res) as Promise<T>;
  },

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
  },

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
  },

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
  },

  async upload<T = unknown>(
    path: string,
    formData: FormData
  ): Promise<T> {
    const token = await getBearerToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(res) as Promise<T>;
  },
};

/** Register immediately on import so requests are authenticated before any React effects run. */
setApiSessionGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
});
