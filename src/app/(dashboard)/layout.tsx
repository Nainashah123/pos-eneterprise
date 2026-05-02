'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';

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

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  if (!accessToken) return null;

  const title = PAGE_TITLES[pathname] ?? 'POS Enterprise';
  return <DashboardLayout title={title}>{children}</DashboardLayout>;
}
