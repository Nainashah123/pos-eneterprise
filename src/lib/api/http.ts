const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function drainQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function getStore() {
  const { useAuthStore } = await import('@/store/authStore');
  return useAuthStore.getState();
}

async function tryRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = await getStore();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clear();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const json = await res.json();
  const { accessToken: newAccess, refreshToken: newRefresh } = json.data;
  setTokens(newAccess, newRefresh);
  return newAccess;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = await getStore();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    let newToken: string | null;

    if (!isRefreshing) {
      isRefreshing = true;
      newToken = await tryRefresh();
      isRefreshing = false;
      drainQueue(newToken);
    } else {
      newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
    }

    if (!newToken) throw new Error('Unauthorized');

    headers['Authorization'] = `Bearer ${newToken}`;
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }

  const json = await res.json();
  return json.data as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
