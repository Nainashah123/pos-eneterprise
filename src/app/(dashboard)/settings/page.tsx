'use client';

import { useState } from 'react';
import { Store, CreditCard, Users, Save, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/client';
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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Tab nav */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
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

      {/* Store settings */}
      {tab === 'Store' && (
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Store Name" defaultValue="POS Enterprise Store" />
              <Input label="Phone" defaultValue="+91 98765 00000" />
              <Input label="Email" type="email" defaultValue="store@posapp.com" />
              <Select label="Currency">
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
              </Select>
              <Select label="Timezone">
                <option>Asia/Kolkata (IST +5:30)</option>
                <option>America/New_York (EST)</option>
                <option>Europe/London (GMT)</option>
              </Select>
              <Select label="Receipt Footer">
                <option>Thank you for shopping!</option>
                <option>Come again soon!</option>
                <option>Custom message...</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Store Address
              </label>
              <textarea
                defaultValue="12, MG Road, Bengaluru, Karnataka - 560001"
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} leftIcon={<Save className="h-4 w-4" />}>
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tax settings */}
      {tab === 'Tax' && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Configuration</CardTitle>
          </CardHeader>
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Enable Tax</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Apply tax to applicable products
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Default Tax Rate (%)" type="number" defaultValue="9" min="0" max="100" />
              <Select label="Tax Type">
                <option>GST (Goods & Services Tax)</option>
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

            <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300">
              <p className="font-semibold mb-1">Tax Registration (GST)</p>
              <p className="text-xs">GSTIN: 29AABCU9603R1ZX</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} leftIcon={<Save className="h-4 w-4" />}>
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
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Users & Roles</h3>
            <Button size="sm">Invite User</Button>
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
                <Th>Actions</Th>
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
                      <Td>
                        <Button variant="ghost" size="xs">Edit</Button>
                      </Td>
                    </Tr>
                  ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
