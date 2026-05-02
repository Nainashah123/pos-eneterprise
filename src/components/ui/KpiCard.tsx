'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  icon: ReactNode;
  iconBg: string;
  loading?: boolean;
}

export function KpiCard({ title, value, change, icon, iconBg, loading }: KpiCardProps) {
  const isPositive = change >= 0;
  const absChange = Math.abs(change);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-5">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow p-5 flex items-start gap-4"
    >
      <div className={cn('p-3 rounded-2xl shrink-0', iconBg)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>

        {/* Change indicator */}
        <div
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium mt-1',
            isPositive ? 'text-emerald-600' : 'text-red-500',
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? '+' : '-'}
          {absChange.toFixed(1)}% vs yesterday
        </div>

        {/* Animated progress bar */}
        <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, absChange * 5)}%` }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'h-full rounded-full',
              isPositive
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-red-400 to-red-500',
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}
