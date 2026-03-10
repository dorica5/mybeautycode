import Constants from "expo-constants";

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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (getSessionFn) {
    const session = await getSessionFn();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
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
    const err = new Error(
      (data as { error?: string })?.error ?? res.statusText ?? "Request failed"
    );
    (err as Error & { status?: number }).status = res.status;
    throw err;
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
    const session = getSessionFn ? await getSessionFn() : null;
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(res) as Promise<T>;
  },
};
