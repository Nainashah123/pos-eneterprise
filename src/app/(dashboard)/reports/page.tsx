'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Download, FileText, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/client';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function useReportData() {
  return {
    daily: useQuery({ queryKey: ['reports', 'daily'], queryFn: () => reportsApi.getDailySales() }),
    category: useQuery({ queryKey: ['reports', 'category'], queryFn: () => reportsApi.getSalesByCategory() }),
    topProducts: useQuery({ queryKey: ['reports', 'top-products'], queryFn: () => reportsApi.getTopProducts() }),
  };
}

export default function ReportsPage() {
  const { daily, category, topProducts } = useReportData();

  const totalRevenue = daily.data?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = daily.data?.reduce((s, d) => s + d.orders, 0) ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Export bar */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
          Export CSV
        </Button>
        <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
          Export PDF
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: '17-Day Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-950' },
          { label: 'Total Orders', value: formatNumber(totalOrders), icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' },
          { label: 'Avg. Order Value', value: formatCurrency(avgOrderValue), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg} shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Daily revenue bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue (Last 17 Days)</CardTitle>
        </CardHeader>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={daily.data ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(new Date(d), 'dd MMM')}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: any) => [formatCurrency(v as number), 'Revenue']}
              labelFormatter={(l: any) => format(new Date(l as string), 'MMM d, yyyy')}
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={category.data ?? []}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="revenue"
                nameKey="category"
              >
                {(category.data ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any) => formatCurrency(v as number)}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top products table */}
        <Card padding="none">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Products</h3>
          </div>
          <Table>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Product</Th>
                <Th>Units</Th>
                <Th>Revenue</Th>
              </tr>
            </Thead>
            <Tbody>
              {(topProducts.data ?? []).map((p, i) => (
                <Tr key={p.productId}>
                  <Td className="font-bold text-gray-400">#{i + 1}</Td>
                  <Td className="font-medium">{p.productName}</Td>
                  <Td>{formatNumber(p.units)}</Td>
                  <Td className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(p.revenue)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </div>

      {/* Category breakdown table */}
      <Card padding="none">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Category</Th>
              <Th>Units Sold</Th>
              <Th>Revenue</Th>
              <Th>Share</Th>
            </tr>
          </Thead>
          <Tbody>
            {(category.data ?? []).map((c, i) => {
              const total = (category.data ?? []).reduce((s, x) => s + x.revenue, 0);
              const pct = total > 0 ? (c.revenue / total) * 100 : 0;
              return (
                <Tr key={c.category}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="capitalize">{c.category}</span>
                    </div>
                  </Td>
                  <Td>{formatNumber(c.units)}</Td>
                  <Td className="font-semibold">{formatCurrency(c.revenue)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 w-20">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
