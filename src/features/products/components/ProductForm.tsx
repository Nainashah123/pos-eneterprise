'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Product, ProductFormData, ProductCategory } from '@/types';

const CATEGORIES: ProductCategory[] = [
  'beverages', 'food', 'electronics', 'clothing',
  'accessories', 'beauty', 'home', 'sports', 'other',
];

interface ProductFormProps {
  initial?: Product;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductForm({ initial, onSave, onCancel, loading }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    category: initial?.category ?? 'other',
    price: initial?.price ?? 0,
    cost: initial?.cost ?? 0,
    stock: initial?.stock ?? 0,
    minStock: initial?.minStock ?? 5,
    image: initial?.image ?? '',
    description: initial?.description ?? '',
    taxable: initial?.taxable ?? true,
    active: initial?.active ?? true,
  });

  const set = (key: keyof ProductFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Espresso Shot"
          required
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => set('sku', e.target.value)}
          placeholder="BEV-001"
          required
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => set('category', e.target.value as ProductCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </Select>
        <Input
          label="Price (₹)"
          type="number"
          min={0}
          step={0.01}
          value={form.price}
          onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
          required
        />
        <Input
          label="Cost (₹)"
          type="number"
          min={0}
          step={0.01}
          value={form.cost}
          onChange={(e) => set('cost', parseFloat(e.target.value) || 0)}
        />
        <Input
          label="Stock Quantity"
          type="number"
          min={0}
          value={form.stock}
          onChange={(e) => set('stock', parseInt(e.target.value) || 0)}
          required
        />
        <Input
          label="Min Stock Alert"
          type="number"
          min={0}
          value={form.minStock}
          onChange={(e) => set('minStock', parseInt(e.target.value) || 0)}
        />
        <Input
          label="Image URL"
          value={form.image}
          onChange={(e) => set('image', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Product description..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Image preview */}
      {form.image && (
        <div className="rounded-xl overflow-hidden h-32 bg-gray-100 dark:bg-gray-800">
          <img src={form.image} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.taxable}
            onChange={(e) => set('taxable', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Taxable</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
