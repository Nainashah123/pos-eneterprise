'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Order } from '@/types';

const STATUS_VARIANTS = {
  completed: 'success',
  pending: 'warning',
  refunded: 'info',
  cancelled: 'danger',
} as const;

interface RecentOrdersProps {
  orders: Order[];
  loading?: boolean;
}

export function RecentOrders({ orders, loading }: RecentOrdersProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
        <Link href="/orders">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
            View all
          </Button>
        </Link>
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Method</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th>Time</Th>
          </tr>
        </Thead>
        <Tbody>
          {orders.map((order) => (
            <Tr key={order.id}>
              <Td className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {order.orderNumber}
              </Td>
              <Td>{order.customerName ?? 'Walk-in'}</Td>
              <Td className="capitalize">{order.paymentMethod}</Td>
              <Td className="font-semibold">{formatCurrency(order.total)}</Td>
              <Td>
                <Badge variant={STATUS_VARIANTS[order.status]} dot>
                  {order.status}
                </Badge>
              </Td>
              <Td className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  );
}
