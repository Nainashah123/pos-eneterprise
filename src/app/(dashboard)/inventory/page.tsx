'use client';

import { useState } from 'react';
import { AlertTriangle, Package, Plus, Minus, RefreshCw, Boxes } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Product } from '@/types';

function useLowStock() {
  return useQuery({ queryKey: ['inventory', 'low-stock'], queryFn: inventoryApi.getLowStockProducts });
}

function useStockMovements() {
  return useQuery({ queryKey: ['inventory', 'movements'], queryFn: inventoryApi.getStockMovements });
}

function useAllProducts() {
  return useQuery({ queryKey: ['inventory', 'all'], queryFn: () =>
    import('@/lib/api/client').then((m) => m.productsApi.getAll({ pageSize: 100 })),
  });
}

export default function InventoryPage() {
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const qc = useQueryClient();

  const { data: lowStock, isLoading: lowLoading } = useLowStock();
  const { data: movements } = useStockMovements();
  const { data: allProductsData } = useAllProducts();
  const allProducts = allProductsData?.data ?? [];

  const adjustMutation = useMutation({
    mutationFn: ({ id, qty, reason }: { id: string; qty: number; reason: string }) =>
      inventoryApi.adjustStock(id, qty, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setAdjustProduct(null);
      setAdjQty('');
      setAdjReason('');
    },
  });

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {(lowStock?.length ?? 0) > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {lowStock?.length} product{lowStock?.length !== 1 ? 's' : ''} need restocking
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {lowStock?.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Low stock products */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
          <Badge variant="warning">{lowStock?.length ?? 0} items</Badge>
        </CardHeader>
        {lowLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : (lowStock?.length ?? 0) === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="All products are well-stocked" />
        ) : (
          <div className="space-y-2">
            {lowStock?.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[120px]">
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          p.stock === 0 ? 'bg-red-500' : 'bg-amber-500',
                        )}
                        style={{ width: `${Math.min(100, (p.stock / p.minStock) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {p.stock} / {p.minStock} min
                    </span>
                  </div>
                </div>
                {p.stock === 0 ? (
                  <Badge variant="danger" dot>Out of Stock</Badge>
                ) : (
                  <Badge variant="warning" dot>Low</Badge>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => setAdjustProduct(p)}
                >
                  Restock
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Full inventory table */}
      <Card padding="none">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Products — Stock Levels</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Category</Th>
              <Th>Stock</Th>
              <Th>Min Stock</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {allProducts.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="h-8 w-8 rounded-lg object-cover" />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{product.name}</span>
                  </div>
                </Td>
                <Td className="font-mono text-xs">{product.sku}</Td>
                <Td className="capitalize text-sm">{product.category}</Td>
                <Td>
                  <span className={cn(
                    'font-bold text-sm',
                    product.stock === 0 ? 'text-red-600' :
                    product.stock <= product.minStock ? 'text-amber-600' : 'text-emerald-600',
                  )}>
                    {product.stock}
                  </span>
                </Td>
                <Td className="text-sm text-gray-500">{product.minStock}</Td>
                <Td>
                  {product.stock === 0 ? (
                    <Badge variant="danger" dot>Out of Stock</Badge>
                  ) : product.stock <= product.minStock ? (
                    <Badge variant="warning" dot>Low</Badge>
                  ) : (
                    <Badge variant="success" dot>OK</Badge>
                  )}
                </Td>
                <Td>
                  <Button variant="ghost" size="xs" onClick={() => setAdjustProduct(product)}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Adjust
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {/* Stock movements */}
      {movements && movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">{m.productName}</span>
                  <span className="text-gray-400 ml-2">{m.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'font-bold',
                    m.type === 'in' ? 'text-emerald-600' :
                    m.type === 'out' ? 'text-red-500' : 'text-amber-600',
                  )}>
                    {m.type === 'in' ? '+' : ''}{m.quantity}
                  </span>
                  <Badge
                    variant={m.type === 'in' ? 'success' : m.type === 'out' ? 'danger' : 'warning'}
                  >
                    {m.type}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatDate(m.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustProduct}
        onClose={() => { setAdjustProduct(null); setAdjQty(''); setAdjReason(''); }}
        title="Adjust Stock"
        description={adjustProduct?.name}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm">
            <p className="text-gray-500">Current stock:</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {adjustProduct?.stock} units
            </p>
          </div>
          <Input
            label="Adjustment (+/-)"
            type="number"
            value={adjQty}
            onChange={(e) => setAdjQty(e.target.value)}
            placeholder="+10 or -5"
          />
          <Input
            label="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Stock replenishment, correction..."
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAdjustProduct(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (adjustProduct) {
                  adjustMutation.mutate({
                    id: adjustProduct.id,
                    qty: parseInt(adjQty) || 0,
                    reason: adjReason,
                  });
                }
              }}
              loading={adjustMutation.isPending}
              disabled={!adjQty || !adjReason}
            >
              Apply Adjustment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
