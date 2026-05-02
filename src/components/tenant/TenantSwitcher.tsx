'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTenantStore } from '@/store/tenantStore';
import { PlanBadge } from './PlanBadge';

interface TenantSwitcherProps {
  collapsed?: boolean;
}

export function TenantSwitcher({ collapsed = false }: TenantSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currentTenant, tenants, switchTenant } = useTenantStore();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSwitch(id: string) {
    switchTenant(id);
    setOpen(false);
  }

  const initials = currentTenant.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? currentTenant.name : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-150',
          'text-gray-300 hover:text-white hover:bg-white/10',
          open && 'bg-white/10 text-white',
          collapsed && 'justify-center px-2',
        )}
      >
        {/* Avatar */}
        <div className="h-7 w-7 rounded-lg bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-300">
          {initials}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate text-white leading-tight">
                {currentTenant.name}
              </p>
              <PlanBadge tier={currentTenant.plan} className="mt-0.5" />
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-gray-400',
                open && 'rotate-180',
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute z-50 bottom-full mb-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden',
            collapsed ? 'left-full ml-2 w-[280px]' : 'left-0 right-0 w-[280px]',
          )}
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Organizations
            </p>
          </div>

          {/* Tenant list */}
          <ul className="px-2 pb-2 space-y-0.5 max-h-60 overflow-y-auto">
            {tenants.map((tenant) => {
              const isActive = tenant.id === currentTenant.id;
              const tInitials = tenant.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              return (
                <li key={tenant.id}>
                  <button
                    onClick={() => handleSwitch(tenant.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                      isActive
                        ? 'bg-indigo-600/20 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/8',
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300',
                      )}
                    >
                      {tInitials}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {tenant.name}
                      </p>
                      <div className="mt-0.5">
                        <PlanBadge tier={tenant.plan} />
                      </div>
                    </div>
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Divider */}
          <div className="h-px bg-white/10 mx-3" />

          {/* Add Organization */}
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150"
              onClick={() => setOpen(false)}
            >
              <div className="h-8 w-8 rounded-lg border border-dashed border-gray-600 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">Add Organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
