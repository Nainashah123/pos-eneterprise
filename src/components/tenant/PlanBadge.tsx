'use client';

import { Zap, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PlanTier } from '@/types/tenant';

interface PlanBadgeProps {
  tier: PlanTier;
  className?: string;
  size?: 'sm' | 'md';
}

const PLAN_STYLES: Record<
  PlanTier,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  starter: {
    label: 'Starter',
    icon: Sparkles,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
  },
  professional: {
    label: 'Professional',
    icon: Zap,
    bg: 'bg-indigo-100 dark:bg-indigo-950',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  enterprise: {
    label: 'Enterprise',
    icon: Star,
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

export function PlanBadge({ tier, className, size = 'sm' }: PlanBadgeProps) {
  const config = PLAN_STYLES[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {config.label}
    </span>
  );
}
