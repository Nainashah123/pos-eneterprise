import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant } from '@/types/tenant';
import { MOCK_TENANTS } from '@/data/tenants';

interface TenantStore {
  currentTenant: Tenant;
  tenants: Tenant[];
  switchTenant: (id: string) => void;
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      currentTenant: MOCK_TENANTS[0],
      tenants: MOCK_TENANTS,
      switchTenant: (id) =>
        set((s) => ({
          currentTenant: s.tenants.find((t) => t.id === id) ?? s.currentTenant,
        })),
    }),
    { name: 'pos-tenant' },
  ),
);
