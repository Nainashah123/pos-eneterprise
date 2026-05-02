'use client';

import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { SalesChart } from '@/features/dashboard/components/SalesChart';
import { CategoryChart } from '@/features/dashboard/components/CategoryChart';
import { RecentOrders } from '@/features/dashboard/components/RecentOrders';
import { AiInsights } from '@/features/dashboard/components/AiInsights';
import { AiPredictionChart } from '@/features/dashboard/components/AiPredictionChart';
import {
  useDashboardKPIs,
  useDailySales,
  useSalesByCategory,
  useRecentOrders,
} from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/format';

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: dailySales, isLoading: salesLoading } = useDailySales();
  const { data: categoryData, isLoading: catLoading } = useSalesByCategory();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Revenue"
          value={kpis ? formatCurrency(kpis.todayRevenue) : '—'}
          change={kpis?.revenueChange ?? 0}
          icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-100 dark:bg-indigo-950"
          loading={kpisLoading}
        />
        <KpiCard
          title="Today's Orders"
          value={kpis ? kpis.todayOrders.toString() : '—'}
          change={kpis?.ordersChange ?? 0}
          icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          loading={kpisLoading}
        />
        <KpiCard
          title="New Customers"
          value={kpis ? kpis.todayCustomers.toString() : '—'}
          change={kpis?.customersChange ?? 0}
          icon={<Users className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-100 dark:bg-sky-950"
          loading={kpisLoading}
        />
        <KpiCard
          title="Avg. Order Value"
          value={kpis ? formatCurrency(kpis.todayAvgOrder) : '—'}
          change={kpis?.avgOrderChange ?? 0}
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-950"
          loading={kpisLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesChart data={dailySales ?? []} loading={salesLoading} />
        </div>
        <CategoryChart data={categoryData ?? []} loading={catLoading} />
      </div>

      {/* AI Prediction + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentOrders orders={recentOrders ?? []} loading={ordersLoading} />
        </div>
        <div className="flex flex-col gap-6">
          <AiPredictionChart />
        </div>
      </div>

      {/* AI Insights full width */}
      <AiInsights />
    </div>
  );
}
