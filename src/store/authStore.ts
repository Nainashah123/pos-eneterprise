// WHY: We import `create` from Zustand — Zustand is a tiny library that gives us a "global state store"
// so any component in the app can read/update the logged-in user without passing props everywhere.
import { create } from 'zustand';

// WHY: `persist` is a Zustand middleware (a plugin) that automatically saves the store's state to
// localStorage so the user stays logged in even after refreshing the browser.
import { persist } from 'zustand/middleware';

// WHY: We read the backend URL from an environment variable so we can change it per environment
// (dev/staging/prod) without touching the code. The `??` operator means "use the right side if
// the left side is null or undefined" — a safe fallback for local development.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// WHY: A TypeScript `interface` is a blueprint that describes the shape of an object — like a contract
// that says "any AuthUser object MUST have these exact fields with these exact types."
// `export` means other files can import and reuse this type definition.
export interface AuthUser {
  id: string;       // WHY: Every user has a unique ID (a UUID string) so the backend can identify them.
  email: string;    // WHY: The email is used as the login username.
  name: string;     // WHY: The display name shown in the UI header.
  role: 'ADMIN' | 'MANAGER' | 'CASHIER'; // WHY: Union type — the role can only be one of these three exact strings, nothing else.
  storeId: string;  // WHY: Each user belongs to a specific store; the backend uses this to scope all their data.
}

// WHY: This interface describes the shape of our entire auth store — both the data we hold
// (user, tokens) AND the actions (functions) that can change that data.
interface AuthStore {
  user: AuthUser | null;          // WHY: `| null` means the user can be either an AuthUser object OR null (not logged in yet).
  accessToken: string | null;     // WHY: A short-lived JWT token (15 min) sent with every API request to prove identity.
  refreshToken: string | null;    // WHY: A long-lived token (7 days) used only to get a new accessToken when it expires.
  login: (email: string, password: string, storeId?: string) => Promise<void>; // WHY: `Promise<void>` means this is an async function that does work but returns nothing on success.
  logout: () => Promise<void>;    // WHY: Async because it needs to tell the server to invalidate the token before clearing local state.
  setTokens: (accessToken: string, refreshToken: string) => void; // WHY: Used by the HTTP client to swap in freshly refreshed tokens without a full re-login.
  clear: () => void;              // WHY: Instantly wipes all auth state (used when refresh fails and we need to force a logout).
}

// WHY: `create<AuthStore>()` builds our Zustand store. The `useAuthStore` name follows the React
// "hook" naming convention (hooks always start with `use`) so React knows how to manage its lifecycle.
// `export const` makes it available to every component that needs auth data.
export const useAuthStore = create<AuthStore>()(
  // WHY: Wrapping with `persist(...)` tells Zustand to automatically save/restore this store
  // from localStorage, so auth survives page refreshes.
  persist(
    // WHY: Zustand calls this function with `set` (to update state) and `get` (to read current state).
    // We return an object that holds both the initial state values and the action functions.
    (set, get) => ({
      // WHY: Initial values are all null because no one is logged in when the app first loads
      // (unless persist restores them from localStorage).
      user: null,
      accessToken: null,
      refreshToken: null,

      // WHY: `async` means this function can use `await` to pause and wait for the network request
      // to finish before continuing — without blocking the rest of the browser.
      login: async (email, password, storeId = 'store-default') => {
        // WHY: `fetch` is the browser's built-in function for making HTTP requests to a server.
        // We `await` it so we pause here until the server responds.
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',                                   // WHY: POST sends data to the server (vs GET which only retrieves).
          headers: { 'Content-Type': 'application/json' }, // WHY: This header tells the server we're sending JSON, not a form.
          body: JSON.stringify({ email, password, storeId }), // WHY: `JSON.stringify` converts a JS object into a JSON text string the server can parse.
        });

        // WHY: `res.ok` is true only when the HTTP status code is 200-299 (success range).
        // If it's false (e.g. 401 Unauthorized), we treat it as a failed login.
        if (!res.ok) {
          // WHY: `.catch(() => ({}))` means "if parsing the error body fails, just use an empty object"
          // so we never crash even if the server sends back non-JSON on error.
          const err = await res.json().catch(() => ({}));
          // WHY: We throw an Error so the calling code (the login form) can catch it and show a message.
          throw new Error(err.message || 'Invalid email or password');
        }

        // WHY: We parse the response body from JSON text into a JavaScript object.
        const json = await res.json();
        // WHY: Destructuring — we pull three named fields out of `json.data` into individual variables.
        // The backend always wraps its response in a `data` field (see CLAUDE.md).
        const { accessToken, refreshToken, user } = json.data;
        // WHY: `set(...)` is Zustand's way of updating the store — it merges the new values into
        // the existing state and triggers all subscribed components to re-render.
        set({ accessToken, refreshToken, user });
      },

      logout: async () => {
        // WHY: `get()` reads the current store state without subscribing to updates — useful inside
        // action functions that need the current token.
        const { accessToken } = get();
        if (accessToken) {
          // WHY: We tell the server to invalidate the token (blacklist it in Redis) so it can't be
          // reused even if someone stole it. Bearer is the standard scheme for JWT auth headers.
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }, // WHY: "Bearer <token>" is the standard HTTP Authorization header format for JWT tokens.
          }).catch(() => {}); // WHY: We silently swallow errors here — even if the server call fails, we still clear local state.
        }
        // WHY: Whether the server call succeeded or not, we wipe the local tokens so the user
        // is treated as logged out in the UI immediately.
        set({ user: null, accessToken: null, refreshToken: null });
      },

      // WHY: A simple helper used by the HTTP client (http.ts) after a successful token refresh,
      // so it can update the stored tokens without triggering a full logout/login cycle.
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      // WHY: A synchronous (non-async) reset — called when the refresh token itself is expired or
      // invalid, forcing the user back to the login page.
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    // WHY: The `name` option is the localStorage key where Zustand saves the serialized store state.
    // Open browser DevTools → Application → localStorage → look for "pos-auth" to see it.
    { name: 'pos-auth' },
  ),
);
