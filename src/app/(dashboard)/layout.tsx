// WHY: `'use client'` tells Next.js this component runs in the browser, not on the server.
// It's required because we use React hooks (`useEffect`, `usePathname`, `useRouter`) which
// only work in the browser where there's an actual DOM and navigation history.
'use client';

// WHY: `useEffect` is a React hook that runs a side-effect (like redirecting) AFTER the component
// has rendered to the screen. It's the safe place to run code that interacts with the browser.
import { useEffect } from 'react';

// WHY: `usePathname` gives us the current URL path (e.g. "/products") as a string so we can
// look up the matching page title. `useRouter` lets us navigate programmatically.
import { usePathname, useRouter } from 'next/navigation';

// WHY: `DashboardLayout` is a custom component that wraps every dashboard page with the
// shared sidebar, top nav, and page structure — so we don't repeat that markup in every page file.
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// WHY: We import the Zustand auth store so this layout can read the `accessToken` and redirect
// unauthenticated users before the dashboard content ever renders.
import { useAuthStore } from '@/store/authStore';

// WHY: `Record<string, string>` is a TypeScript type for "an object where both keys and values are strings."
// We use it for a simple path → title mapping table.
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Point of Sale',
  '/products': 'Products',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

// WHY: In Next.js's App Router, any file named `layout.tsx` automatically wraps all pages inside
// its folder. `(dashboard)` is a "route group" — the parentheses mean the folder name is NOT
// part of the URL path, it just organizes files. So this layout applies to `/`, `/pos`, `/products`, etc.
// `{ children }` is the page content injected by Next.js — we render it inside our shell.
export default function Layout({ children }: { children: React.ReactNode }) {
  // WHY: `usePathname()` returns the current URL path (e.g. "/products") so we can look up
  // the right page title to display in the top bar.
  const pathname = usePathname();

  // WHY: We need `router` here so we can redirect to `/login` if the user isn't authenticated.
  const router = useRouter();

  // WHY: We read ONLY `accessToken` from the store. If the token is null, the user is not logged in.
  // The selector `(s) => s.accessToken` means this component only re-renders when the token changes.
  const accessToken = useAuthStore((s) => s.accessToken);

  // WHY: `useEffect` is the right place to run navigation side-effects. We can't call `router.replace`
  // directly in the component body — that would cause an error during render. The effect runs after render.
  // The dependency array `[accessToken, router]` means: re-run this effect whenever the token changes
  // (e.g. when the user logs out in another tab and the store clears).
  useEffect(() => {
    // WHY: If there is no accessToken (null), the user is not authenticated — redirect them to login.
    // `router.replace` is used instead of `router.push` so the login page replaces the current
    // history entry, meaning the back button won't bring them back to the dashboard they can't access.
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  // WHY: While the redirect is happening (between render and the useEffect running), we return `null`
  // so no dashboard content flashes on screen for a brief moment to an unauthenticated user.
  if (!accessToken) return null;

  // WHY: The `??` operator means "use the right side if the left side is null/undefined."
  // If the current path isn't in our PAGE_TITLES map, fall back to 'POS Enterprise'.
  const title = PAGE_TITLES[pathname] ?? 'POS Enterprise';

  // WHY: We pass the resolved `title` and `children` (the actual page content) into DashboardLayout,
  // which renders them inside the shared sidebar + navbar shell.
  return <DashboardLayout title={title}>{children}</DashboardLayout>;
}
