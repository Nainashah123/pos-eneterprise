'use client';

import { useState, useEffect } from 'react';
import { Store, CreditCard, Users, Save, Shield, Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, storesApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types';

const TABS = ['Store', 'Tax', 'Users'] as const;
type Tab = typeof TABS[number];

const ROLE_VARIANTS: Record<UserRole, 'primary' | 'warning' | 'default'> = {
  admin: 'primary',
  manager: 'warning',
  cashier: 'default',
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Store');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);

  const { user: authUser } = useAuthStore();
  const storeId = authUser?.storeId ?? '';
  const isAdmin = authUser?.role === 'ADMIN';
  const qc = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => storesApi.getById(storeId),
    enabled: !!storeId,
  });

  const [storeForm, setStoreForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });

  const [taxForm, setTaxForm] = useState({ taxRate: 0 });

  useEffect(() => {
    if (store) {
      setStoreForm({
        name: store.name ?? '',
        phone: store.phone ?? '',
        email: store.email ?? '',
        address: store.address ?? '',
        currency: store.currency ?? 'INR',
        timezone: store.timezone ?? 'Asia/Kolkata',
      });
      setTaxForm({ taxRate: store.taxRate ?? 0 });
    }
  }, [store]);

  const handleSaveStore = async () => {
    if (!isAdmin && authUser?.role !== 'MANAGER') return;
    setSaving(true);
    setApiError('');
    try {
      await storesApi.update(storeId, storeForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ['store', storeId] });
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTax = async () => {
    if (!isAdmin && authUser?.role !== 'MANAGER') return;
    setSaving(true);
    setApiError('');
    try {
      await storesApi.update(storeId, { taxRate: taxForm.taxRate });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="max-w-3xl space-y-5">
      {/* Tab nav */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setApiError(''); setSaved(false); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {t === 'Store' && <Store className="h-4 w-4" />}
            {t === 'Tax' && <CreditCard className="h-4 w-4" />}
            {t === 'Users' && <Users className="h-4 w-4" />}
            {t}
          </button>
        ))}
      </div>

      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {apiError}
        </div>
      )}

      {/* Store settings */}
      {tab === 'Store' && (
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          {storeLoading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Store Name"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Select
                  label="Currency"
                  value={storeForm.currency}
                  onChange={(e) => setStoreForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                </Select>
                <Select
                  label="Timezone"
                  value={storeForm.timezone}
                  onChange={(e) => setStoreForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Store Address
                </label>
                <textarea
                  value={storeForm.address}
                  onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveStore} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tax settings */}
      {tab === 'Tax' && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Configuration</CardTitle>
          </CardHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={taxForm.taxRate}
                onChange={(e) => setTaxForm({ taxRate: Number(e.target.value) })}
                min="0"
                max="100"
              />
              <Select label="Tax Type">
                <option>GST (Goods &amp; Services Tax)</option>
                <option>VAT (Value Added Tax)</option>
                <option>Sales Tax</option>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Inclusive Pricing</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Display prices with tax included
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveTax} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users & roles */}
      {tab === 'Users' && (
        <Card padding="none">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Users &amp; Roles</h3>
            {isAdmin && (
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
                Invite User
              </Button>
            )}
          </div>

          {/* Role permissions info */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3">
            {[
              { role: 'Admin' as const, perms: ['Full access', 'User management', 'Settings', 'Reports'], color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900' },
              { role: 'Manager' as const, perms: ['POS access', 'Products', 'Orders', 'Reports'], color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900' },
              { role: 'Cashier' as const, perms: ['POS access', 'View orders', 'View customers'], color: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
            ].map(({ role, perms, color }) => (
              <div key={role} className={`rounded-xl p-3 border ${color}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{role}</span>
                </div>
                <ul className="space-y-0.5">
                  {perms.map((p) => (
                    <li key={p} className="text-[10px] text-gray-500 dark:text-gray-400">• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Table>
            <Thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                {isAdmin && <Th>Actions</Th>}
              </tr>
            </Thead>
            <Tbody>
              {usersLoading
                ? Array(4).fill(0).map((_, i) => (
                    <Tr key={i}>
                      <Td colSpan={5}>
                        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </Td>
                    </Tr>
                  ))
                : users?.map((user) => (
                    <Tr key={user.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant={ROLE_VARIANTS[user.role]} className="capitalize">
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        {user.active ? (
                          <Badge variant="success" dot>Active</Badge>
                        ) : (
                          <Badge variant="default" dot>Inactive</Badge>
                        )}
                      </Td>
                      <Td className="text-xs text-gray-400">{formatDate(user.createdAt)}</Td>
                      {isAdmin && (
                        <Td>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="xs" onClick={() => setEditUser(user)}>Edit</Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => toggleMutation.mutate(user.id)}
                              className={user.active ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'}
                            >
                              {user.active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </Td>
                      )}
                    </Tr>
                  ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Invite user modal */}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => { qc.invalidateQueries({ queryKey: ['users'] }); setInviteOpen(false); }}
      />

      {/* Edit user modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); }}
        />
      )}
    </div>
  );
}

// ─── Invite User Modal ──────────────────────────────────────────────────────

function InviteUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return; }
    if (form.password.length < 8) { setError('Password min 8 characters'); return; }
    setSaving(true);
    setError('');
    try {
      await usersApi.create(form);
      onCreated();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite User" size="sm">
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
        <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="CASHIER">Cashier</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create User</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit User Modal ────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role?.toUpperCase() ?? 'CASHIER', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: any = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      await usersApi.update(user.id, payload);
      onSaved();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Edit — ${user.name}`} size="sm">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="CASHIER">Cashier</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Input label="New Password (optional)" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
