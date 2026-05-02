'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils/format';
import { ProductForm } from '@/features/products/components/ProductForm';
import type { Product, ProductFormData } from '@/types';
import { cn } from '@/lib/utils/cn';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useProducts({ search: search || undefined });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.data ?? [];

  const handleSave = async (formData: ProductFormData) => {
    if (editProduct) {
      await updateProduct.mutateAsync({ id: editProduct.id, data: formData });
    } else {
      await createProduct.mutateAsync(formData);
    }
    setFormOpen(false);
    setEditProduct(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProduct.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            leftAddon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditProduct(null); setFormOpen(true); }}
        >
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: data?.total ?? 0 },
          { label: 'Low Stock', value: products.filter((p) => p.stock <= p.minStock).length },
          { label: 'Out of Stock', value: products.filter((p) => p.stock === 0).length },
          { label: 'Active', value: products.filter((p) => p.active).length },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No products found"
          description="Add your first product to get started"
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
              Add Product
            </Button>
          }
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-9 w-9 rounded-lg object-cover border border-gray-200 dark:border-gray-800"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{product.description}</p>
                    </div>
                  </div>
                </Td>
                <Td className="font-mono text-xs">{product.sku}</Td>
                <Td className="capitalize">{product.category}</Td>
                <Td className="font-semibold">{formatCurrency(product.price)}</Td>
                <Td>
                  <span
                    className={cn(
                      'font-medium',
                      product.stock === 0
                        ? 'text-red-600'
                        : product.stock <= product.minStock
                        ? 'text-amber-600'
                        : 'text-gray-700 dark:text-gray-300',
                    )}
                  >
                    {product.stock}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/ min {product.minStock}</span>
                </Td>
                <Td>
                  {product.stock === 0 ? (
                    <Badge variant="danger" dot>Out of Stock</Badge>
                  ) : product.stock <= product.minStock ? (
                    <Badge variant="warning" dot>Low Stock</Badge>
                  ) : (
                    <Badge variant="success" dot>In Stock</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditProduct(product); setFormOpen(true); }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setDeleteId(product.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Product form modal */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditProduct(null); }}
        title={editProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <ProductForm
          initial={editProduct ?? undefined}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditProduct(null); }}
          loading={createProduct.isPending || updateProduct.isPending}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Product" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This will permanently delete the product. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteProduct.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
