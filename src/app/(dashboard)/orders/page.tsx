'use client';

import { useState } from 'react';
import { Search, Eye, ClipboardList } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Order, OrderStatus } from '@/types';

const STATUS_VARIANTS = {
  completed: 'success',
  pending: 'warning',
  refunded: 'info',
  cancelled: 'danger',
} as const;

const PAYMENT_LABELS = { cash: '💵 Cash', card: '💳 Card', upi: '📱 UPI' };

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading } = useOrders({
    search: search || undefined,
    status: status || undefined,
  });

  const orders = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number or customer..."
            leftAddon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          wrapperClassName="w-40"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No orders found"
          description="Orders will appear here after a POS transaction"
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Order #</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Payment</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {orders.map((order) => (
              <Tr key={order.id}>
                <Td className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {order.orderNumber}
                </Td>
                <Td>{order.customerName ?? <span className="text-gray-400">Walk-in</span>}</Td>
                <Td>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Td>
                <Td className="text-sm">{PAYMENT_LABELS[order.paymentMethod]}</Td>
                <Td className="font-semibold">{formatCurrency(order.total)}</Td>
                <Td>
                  <Badge variant={STATUS_VARIANTS[order.status]} dot>
                    {order.status}
                  </Badge>
                </Td>
                <Td className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Order detail modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order ${selectedOrder?.orderNumber}`}
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Customer</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedOrder.customerName ?? 'Walk-in Customer'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Payment</p>
                <p className="font-medium capitalize">{selectedOrder.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                <Badge variant={STATUS_VARIANTS[selectedOrder.status]} dot>
                  {selectedOrder.status}
                </Badge>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Items</p>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white">{item.productName}</span>
                      <span className="text-gray-400 ml-1.5">× {item.quantity}</span>
                      {item.discount > 0 && (
                        <span className="text-xs text-emerald-600 ml-1.5">(-{item.discount}%)</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span><span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span><span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                  <span>Total</span><span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {selectedOrder.note && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
                  {selectedOrder.note}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
