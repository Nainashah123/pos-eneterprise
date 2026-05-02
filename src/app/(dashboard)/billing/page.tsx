'use client';

import { Check, Zap, Star, Sparkles, Users, Package, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTenantStore } from '@/store/tenantStore';
import { PLAN_CONFIGS } from '@/data/tenants';
import type { PlanTier } from '@/types/tenant';
import { cn } from '@/lib/utils/cn';

const PLAN_ORDER: PlanTier[] = ['starter', 'professional', 'enterprise'];

const PLAN_ICON: Record<PlanTier, React.ElementType> = {
  starter: Sparkles,
  professional: Zap,
  enterprise: Star,
};

const PLAN_BADGE_VARIANT: Record<
  PlanTier,
  'default' | 'primary' | 'warning'
> = {
  starter: 'default',
  professional: 'primary',
  enterprise: 'warning',
};

const PLAN_PRICE: Record<PlanTier, string> = {
  starter: '$0',
  professional: '$49',
  enterprise: '$199',
};

const PLAN_PRICE_PERIOD: Record<PlanTier, string> = {
  starter: 'Free forever',
  professional: '/ month',
  enterprise: '/ month',
};

const PLAN_HIGHLIGHT: Record<PlanTier, string> = {
  starter: 'border-gray-200 dark:border-gray-700',
  professional: 'border-indigo-500 ring-2 ring-indigo-500/20',
  enterprise: 'border-amber-400 ring-2 ring-amber-400/20',
};

const PLAN_HEADER_BG: Record<PlanTier, string> = {
  starter: 'bg-gray-50 dark:bg-gray-800/50',
  professional: 'bg-indigo-50 dark:bg-indigo-950/50',
  enterprise: 'bg-amber-50 dark:bg-amber-950/30',
};

const PLAN_ICON_COLOR: Record<PlanTier, string> = {
  starter: 'text-gray-500',
  professional: 'text-indigo-600',
  enterprise: 'text-amber-500',
};

const PLAN_CTA_VARIANT: Record<
  PlanTier,
  'secondary' | 'primary' | 'warning'
> = {
  starter: 'secondary',
  professional: 'primary',
  enterprise: 'warning',
};

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isHigh = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className={cn('font-semibold', isHigh ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
          {used.toLocaleString()} / {max >= 999999 ? 'Unlimited' : max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isHigh ? 'bg-red-500' : 'bg-indigo-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { currentTenant } = useTenantStore();
  const currentPlan = PLAN_CONFIGS[currentTenant.plan];

  // Mock product usage count
  const activeProducts = 47;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Plans</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your subscription and compare available plans.
        </p>
      </div>

      {/* Current plan summary */}
      <Card className="overflow-hidden">
        <div
          className={cn(
            'px-6 py-4 border-b border-gray-200 dark:border-gray-800',
            PLAN_HEADER_BG[currentTenant.plan],
          )}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = PLAN_ICON[currentTenant.plan];
                return (
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm', PLAN_ICON_COLOR[currentTenant.plan])}>
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {currentPlan.label} Plan
                  </h2>
                  <Badge variant={PLAN_BADGE_VARIANT[currentTenant.plan]}>
                    Current Plan
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {currentTenant.name} &mdash; {currentTenant.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {PLAN_PRICE[currentTenant.plan]}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {PLAN_PRICE_PERIOD[currentTenant.plan]}
                </span>
              </p>
            </div>
          </div>
        </div>

        <CardBody className="p-6 space-y-5">
          {/* Usage stats */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usage
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar
                used={currentTenant.activeUsers}
                max={currentPlan.maxUsers}
                label="Team Members"
              />
              <UsageBar
                used={activeProducts}
                max={currentPlan.maxProducts}
                label="Products"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Compare Plans
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((tier) => {
            const plan = PLAN_CONFIGS[tier];
            const Icon = PLAN_ICON[tier];
            const isCurrentPlan = tier === currentTenant.plan;
            const isUpgrade =
              PLAN_ORDER.indexOf(tier) > PLAN_ORDER.indexOf(currentTenant.plan);

            return (
              <div
                key={tier}
                className={cn(
                  'relative bg-white dark:bg-gray-900 rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all',
                  PLAN_HIGHLIGHT[tier],
                )}
              >
                {/* Most popular tag for professional */}
                {tier === 'professional' && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                      POPULAR
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className={cn('p-5 pb-4', PLAN_HEADER_BG[tier])}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm',
                        PLAN_ICON_COLOR[tier],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {plan.label}
                      </h3>
                      {isCurrentPlan && (
                        <Badge variant={PLAN_BADGE_VARIANT[tier]} className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {PLAN_PRICE[tier]}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {PLAN_PRICE_PERIOD[tier]}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 flex-1">
                  <div className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0',
                            tier === 'starter'
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : tier === 'professional'
                              ? 'bg-indigo-100 dark:bg-indigo-950'
                              : 'bg-amber-100 dark:bg-amber-950',
                          )}
                        >
                          <Check
                            className={cn(
                              'h-2.5 w-2.5',
                              tier === 'starter'
                                ? 'text-gray-600'
                                : tier === 'professional'
                                ? 'text-indigo-600'
                                : 'text-amber-600',
                            )}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="p-5 pt-0">
                  {isCurrentPlan ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      variant={PLAN_CTA_VARIANT[tier]}
                      className="w-full"
                      rightIcon={<ArrowUpRight className="h-4 w-4" />}
                    >
                      Upgrade to {plan.label}
                    </Button>
                  ) : (
                    <Button variant="ghost" className="w-full" disabled>
                      Downgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise contact */}
      <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 border-amber-200 dark:border-amber-800">
        <CardBody className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Need a custom plan?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Talk to our sales team for volume pricing, custom integrations, and dedicated support.
              </p>
            </div>
          </div>
          <Button variant="warning" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
            Contact Sales
          </Button>
        </CardBody>
      </Card>

      {/* Billing info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Organization</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                {currentTenant.name}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Billing Email</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                {currentTenant.email}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Address</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                {currentTenant.address}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Phone</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                {currentTenant.phone}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
