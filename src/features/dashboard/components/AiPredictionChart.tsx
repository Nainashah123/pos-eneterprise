'use client';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MOCK_DAILY_SALES, AI_PREDICTION_DATA } from '@/data/mock';

const chartData = [
  ...MOCK_DAILY_SALES.slice(-7).map((d) => ({ date: d.date, actual: d.revenue, predicted: null })),
  ...AI_PREDICTION_DATA,
];

export function AiPredictionChart() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>AI Revenue Forecast</CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            7-day prediction based on historical patterns
          </p>
        </div>
        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">
          AI Powered
        </span>
      </CardHeader>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), 'dd MMM')}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: any, name: any) => [
              `₹${(v as number).toLocaleString()}`,
              name === 'actual' ? 'Actual' : 'AI Predicted',
            ]}
            labelFormatter={(l: any) => format(new Date(l as string), 'MMM d, yyyy')}
            contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Line
            dataKey="predicted"
            name="Predicted"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
