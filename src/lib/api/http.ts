// WHY: We read the backend API base URL from an environment variable so we never hardcode the
// server address — changing one env var switches between dev/staging/production environments.
// The `??` operator provides a fallback value when the variable is not set.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// WHY: If multiple API calls fail with 401 at the same time, we only want to hit the refresh
// endpoint ONCE (not three times). This flag acts as a mutex/lock — "is a refresh already in progress?"
let isRefreshing = false;

// WHY: While the refresh is in progress, any other 401'd requests queue themselves here.
// Each item is a callback function that will be called once the new token is ready.
// `Array<(token: string | null) => void>` is TypeScript for "an array of functions that accept
// a token string (or null) and return nothing."
let refreshQueue: Array<(token: string | null) => void> = [];

// WHY: Once a new token arrives (or refresh fails), this function fires every queued callback
// so all the waiting requests can retry with the new token at the same time.
function drainQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token)); // WHY: `.forEach` loops over every waiting callback and calls it with the new token.
  refreshQueue = []; // WHY: Reset the queue to empty so it's clean for the next 401 wave.
}

// WHY: We import the auth store lazily (inside a function) instead of at the top of the file
// to avoid circular dependency issues — authStore imports nothing from here, but if we imported
// at the top, bundlers can get confused. `async import()` loads the module on first call.
async function getStore() {
  const { useAuthStore } = await import('@/store/authStore');
  // WHY: `.getState()` is Zustand's way to read the store OUTSIDE of a React component (no hook needed).
  return useAuthStore.getState();
}

// WHY: This function attempts to get a fresh accessToken using the stored refreshToken.
// It returns the new accessToken string, or null if the refresh failed.
// `Promise<string | null>` is TypeScript declaring what this async function resolves to.
async function tryRefresh(): Promise<string | null> {
  // WHY: We destructure exactly the three things we need from the store — the current refresh
  // token to send, and the setTokens/clear functions to update state afterwards.
  const { refreshToken, setTokens, clear } = await getStore();
  // WHY: If there's no refresh token at all, there's nothing we can do — return null immediately.
  if (!refreshToken) return null;

  // WHY: Call the backend's dedicated refresh endpoint with the refresh token in the body.
  // This endpoint returns a brand-new pair of tokens without requiring the user's password.
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }), // WHY: Send the refresh token as JSON so the server can validate it.
  });

  // WHY: If the server rejects the refresh token (expired, tampered, or already used),
  // we clear all stored auth state and force the user back to the login page.
  if (!res.ok) {
    clear(); // WHY: Wipes tokens and user from the Zustand store and localStorage.
    // WHY: `typeof window !== 'undefined'` is a guard for server-side rendering — on the server
    // there is no `window` object, so we must check before accessing it.
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  // WHY: Parse the response — the backend wraps everything in a `data` field.
  const json = await res.json();
  // WHY: Rename the destructured fields inline (`accessToken: newAccess`) to avoid shadowing
  // the outer variable name `accessToken` that might be in scope.
  const { accessToken: newAccess, refreshToken: newRefresh } = json.data;
  // WHY: Save the new token pair to the store so future requests and the persist layer stay in sync.
  setTokens(newAccess, newRefresh);
  // WHY: Return the new access token so the caller can immediately retry the failed request.
  return newAccess;
}

// WHY: `apiFetch` is our single central function for every API call in the app.
// Having one function means we add auth headers, error handling, and token refresh in ONE place
// instead of copy-pasting that logic into every component.
// `<T>` is a TypeScript "generic" — the caller tells us what type the response data will be,
// and TypeScript enforces that we return that type.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // WHY: Read the current access token from the store before every request — it may have been
  // refreshed by a concurrent request since the last time we ran.
  const { accessToken } = await getStore();

  // WHY: `Record<string, string>` is TypeScript for "an object where every key and value is a string"
  // — a type-safe way to build up HTTP headers dynamically.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',         // WHY: Tell the server we're always sending/expecting JSON.
    ...(options.headers as Record<string, string>), // WHY: Spread any extra headers the caller passed in (e.g. custom headers).
  };

  // WHY: Only add the Authorization header when we actually have a token — some endpoints (like
  // login itself) are public and don't need it.
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  // WHY: "Bearer" is the standard prefix for JWT tokens in the Authorization HTTP header.
  // The server strips "Bearer " and validates the remaining JWT string.

  // WHY: Make the actual HTTP request, spreading `options` (method, body, etc.) and overriding
  // `headers` with our enriched version that includes the auth token.
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // WHY: HTTP 401 means "Unauthorized" — the access token is missing, expired, or invalid.
  // Instead of showing an error, we try to silently refresh the token and retry the request.
  if (res.status === 401) {
    let newToken: string | null;

    // WHY: Check the mutex flag so only the FIRST 401 triggers a refresh call.
    // All other simultaneous 401s will wait in the queue instead of spamming the refresh endpoint.
    if (!isRefreshing) {
      isRefreshing = true;           // WHY: Lock — block other 401 handlers from starting their own refresh.
      newToken = await tryRefresh(); // WHY: Actually call the refresh endpoint and get a new token.
      isRefreshing = false;          // WHY: Unlock — the refresh is done, future 401s can start a new refresh cycle.
      drainQueue(newToken);          // WHY: Wake up all queued requests with the new (or null) token.
    } else {
      // WHY: A refresh is already in flight — instead of starting another, we register a callback
      // in the queue. `new Promise(resolve => ...)` creates a promise that we can resolve later
      // by calling the `resolve` function, which `drainQueue` will do once the token arrives.
      newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve); // WHY: Store the resolve function so drainQueue can call it with the new token.
      });
    }

    // WHY: If both the refresh attempt and the queue returned null, there's no valid token —
    // we throw so the UI can show an appropriate error (the user will also be redirected to /login).
    if (!newToken) throw new Error('Unauthorized');

    // WHY: Update the Authorization header with the fresh token before retrying.
    headers['Authorization'] = `Bearer ${newToken}`;
    // WHY: Re-execute the exact same request that originally failed, now with a valid token.
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  }

  // WHY: If the response is still not OK after the potential token refresh, extract the server's
  // error message (if any) and throw it so React components can display it in the UI.
  if (!res.ok) {
    let message = `Request failed (${res.status})`; // WHY: Default fallback message includes the HTTP status code for debugging.
    try {
      const err = await res.json();
      // WHY: The backend sends structured error responses with a `message` field — prefer that over
      // the generic fallback, but keep the fallback in case the body isn't valid JSON.
      message = err.message || message;
    } catch {} // WHY: Empty catch — if `.json()` throws (non-JSON body), we just use the default message above.
    throw new Error(message);
  }

  // WHY: Parse the final successful response. The backend always wraps the payload in `json.data`
  // (see CLAUDE.md "Standard backend response wrapper"), so we unwrap it here once
  // rather than in every single API call site.
  const json = await res.json();
  return json.data as T; // WHY: `as T` is a TypeScript type assertion — we tell the compiler "trust us, this is type T".
}

// WHY: A helper to build a URL query string (e.g. "?search=apple&page=1") from a plain object.
// This avoids messy string concatenation scattered throughout the codebase.
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = []; // WHY: We collect individual "key=value" strings here, then join them at the end.
  // WHY: `Object.entries` converts `{ search: "apple", page: 1 }` into `[["search","apple"],["page",1]]`
  // so we can loop over key-value pairs easily.
  for (const [k, v] of Object.entries(params)) {
    // WHY: Skip any parameter that is `undefined` or an empty string — don't send `?search=` to the server.
    if (v !== undefined && v !== '') parts.push(`${k}=${encodeURIComponent(String(v))}`);
    // WHY: `encodeURIComponent` converts special characters (spaces, &, =, etc.) into safe URL-encoded
    // form like `%20` so they don't break the URL structure.
  }
  // WHY: If we have any parts, prefix with `?` and join them with `&` — the standard query string format.
  // If no parts, return an empty string so the URL stays clean.
  return parts.length ? `?${parts.join('&')}` : '';
}
