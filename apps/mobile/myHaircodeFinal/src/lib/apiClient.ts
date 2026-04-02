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

/** One retry after Supabase refresh — fixes expired JWT ("exp" check failed on backend). */
async function fetchWithSessionRefresh(
  path: string,
  init: RequestInit
): Promise<Response> {
  const url = `${API_URL}${path}`;
  const auth = await getAuthHeaders();
  const merged: Record<string, string> = {
    ...auth,
    ...(init.headers as Record<string, string> | undefined),
  };
  let res = await fetch(url, { ...init, headers: merged });
  if (res.status !== 401) {
    return res;
  }

  const { error } = await supabase.auth.refreshSession();
  if (error) {
    return res;
  }

  const auth2 = await getAuthHeaders();
  const merged2: Record<string, string> = {
    ...auth2,
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...init, headers: merged2 });
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
    let msg =
      typeof (data as { error?: string })?.error === "string"
        ? (data as { error: string }).error
        : res.statusText?.trim() || "";
    if (!msg) {
      msg =
        res.status === 401
          ? "Session expired. Please sign in again."
          : "Request failed";
    }
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data;
}

export const api = {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetchWithSessionRefresh(path, { method: "GET" });
    return handleResponse(res) as Promise<T>;
  },

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithSessionRefresh(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
  },

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithSessionRefresh(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
  },

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithSessionRefresh(path, {
      method: "DELETE",
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
    let res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (res.status === 401) {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        const token2 = await getBearerToken();
        const h2: Record<string, string> = {};
        if (token2) {
          h2.Authorization = `Bearer ${token2}`;
        }
        res = await fetch(`${API_URL}${path}`, {
          method: "POST",
          headers: h2,
          body: formData,
        });
      }
    }
    return handleResponse(res) as Promise<T>;
  },
};

/** Register immediately on import so requests are authenticated before any React effects run. */
setApiSessionGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
});
