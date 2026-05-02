'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Star } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format';
import type { Customer, CustomerFormData } from '@/types';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useCustomers({ search: search || undefined });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const customers = data?.data ?? [];

  const handleSave = async (formData: CustomerFormData) => {
    if (editCustomer) {
      await updateCustomer.mutateAsync({ id: editCustomer.id, data: formData });
    } else {
      await createCustomer.mutateAsync(formData);
    }
    setFormOpen(false);
    setEditCustomer(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            leftAddon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditCustomer(null); setFormOpen(true); }}
        >
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: data?.total ?? 0 },
          { label: 'VIP Customers', value: customers.filter((c) => c.tags.includes('VIP')).length },
          {
            label: 'Total Loyalty Points',
            value: formatNumber(customers.reduce((s, c) => s + c.loyaltyPoints, 0)),
          },
          {
            label: 'Total Revenue',
            value: formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0)),
          },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No customers found"
          action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Add Customer</Button>}
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Orders</Th>
              <Th>Total Spent</Th>
              <Th>Loyalty Points</Th>
              <Th>Tags</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {customers.map((customer) => (
              <Tr key={customer.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-sm">{customer.phone}</Td>
                <Td>{customer.totalOrders}</Td>
                <Td className="font-semibold">{formatCurrency(customer.totalSpent)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {formatNumber(customer.loyaltyPoints)}
                    </span>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={tag === 'VIP' ? 'warning' : tag === 'Premium' ? 'primary' : 'default'}
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Td>
                <Td className="text-xs text-gray-400">{formatDate(customer.createdAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditCustomer(customer); setFormOpen(true); }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setDeleteId(customer.id)}
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

      {/* Customer form modal */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditCustomer(null); }}
        title={editCustomer ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <CustomerForm
          initial={editCustomer ?? undefined}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditCustomer(null); }}
          loading={createCustomer.isPending || updateCustomer.isPending}
        />
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Customer" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This will permanently delete the customer record.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { if (deleteId) { await deleteCustomer.mutateAsync(deleteId); setDeleteId(null); } }} loading={deleteCustomer.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CustomerForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Customer;
  onSave: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<CustomerFormData>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    tags: initial?.tags ?? [],
  });

  const set = (key: keyof CustomerFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); await onSave(form); }}
      className="space-y-4"
    >
      <Input label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
      <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
      <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Address</label>
        <textarea
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
}
