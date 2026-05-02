import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/client';

export function useDashboardKPIs() {
  return useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: dashboardApi.getKPIs });
}

export function useDailySales() {
  return useQuery({ queryKey: ['dashboard', 'daily-sales'], queryFn: dashboardApi.getDailySales });
}

export function useSalesByCategory() {
  return useQuery({ queryKey: ['dashboard', 'by-category'], queryFn: dashboardApi.getSalesByCategory });
}

export function useTopProducts() {
  return useQuery({ queryKey: ['dashboard', 'top-products'], queryFn: dashboardApi.getTopProducts });
}

export function useRecentOrders() {
  return useQuery({ queryKey: ['dashboard', 'recent-orders'], queryFn: dashboardApi.getRecentOrders });
}
