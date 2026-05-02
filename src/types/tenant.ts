export type PlanTier = 'starter' | 'professional' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  plan: PlanTier;
  currency: string;
  currencySymbol: string;
  timezone: string;
  taxRate: number;
  address: string;
  phone: string;
  email: string;
  activeUsers: number;
  maxUsers: number;
  createdAt: string;
}

export interface TenantPlan {
  tier: PlanTier;
  label: string;
  color: string;
  features: string[];
  maxUsers: number;
  maxProducts: number;
}
