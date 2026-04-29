import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const RAW_API_URL =
  Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3001";
/** Avoid `//api/...` when env has a trailing slash (some hosts then return 404). */
const API_URL = String(RAW_API_URL).replace(/\/+$/, "");

if (__DEV__ && Platform.OS !== "web" && /localhost|127\.0\.0\.1/i.test(API_URL)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[myHaircode] EXPO_PUBLIC_API_URL is localhost — phones/simulators resolve that to themselves. Set EXPO_PUBLIC_API_URL to your machine LAN IP or a tunnel URL and restart expo with -c."
  );
}

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
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.access_token) {
    if (getSessionFn) {
      const s = await getSessionFn();
      return s?.access_token;
    }
    return undefined;
  }

  /** Refresh before expiry so the first request does not get 401 (autoRefreshToken can race behind API calls). */
  const exp = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp > 0 && exp <= nowSec + 90) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
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

const REQUEST_TIMEOUT_MS = 20_000;

/** Avoid hanging forever on unreachable API hosts (common wrong localhost on device). */
async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw Object.assign(new Error("Request timed out"), { status: undefined });
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
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
  let res = await fetchWithTimeout(url, { ...init, headers: merged });
  if (res.status !== 401) {
    return res;
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  const newToken = refreshed?.session?.access_token;
  if (error || !newToken) {
    return res;
  }

  const merged2: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${newToken}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetchWithTimeout(url, { ...init, headers: merged2 });
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
        : typeof (data as { message?: string })?.message === "string"
          ? (data as { message: string }).message
          : res.statusText?.trim() || "";
    if (!msg) {
      msg =
        res.status === 401
          ? "Session expired. Please sign in again."
          : res.status > 0
            ? `Request failed (HTTP ${res.status})`
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
    let res = await fetchWithTimeout(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (res.status === 401) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      const token2 = refreshed?.session?.access_token;
      if (!error && token2) {
        res = await fetchWithTimeout(`${API_URL}${path}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token2}` },
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
