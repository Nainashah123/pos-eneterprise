import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/client';
import type { Order, QueryFilters } from '@/types';

export const ORDERS_KEY = 'orders';

export function useOrders(filters?: QueryFilters) {
  return useQuery({
    queryKey: [ORDERS_KEY, filters],
    queryFn: () => ordersApi.getAll(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [ORDERS_KEY, id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) =>
      ordersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ORDERS_KEY] }),
  });
}
