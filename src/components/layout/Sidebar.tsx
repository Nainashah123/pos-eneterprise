'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  Boxes,
  Settings,
  ChevronLeft,
  Zap,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS', icon: ShoppingCart, highlight: true },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const cartCount = itemCount();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 220 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex flex-col shrink-0 overflow-hidden"
      style={{ background: '#0f0f14' }}
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-purple-950/10" />

      {/* Logo */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
          sidebarCollapsed && 'justify-center px-2',
        )}
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="min-w-0 overflow-hidden"
            >
              <p className="text-sm font-bold text-white truncate whitespace-nowrap">POS Enterprise</p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">Retail System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2"
            >
              Main Menu
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0.5"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href;
            const isPOS = href === '/pos';

            return (
              <motion.div key={href} variants={itemVariants}>
                <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                  <Link
                    href={href}
                    title={sidebarCollapsed ? label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      active
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white',
                      highlight && !active && 'text-indigo-400',
                      sidebarCollapsed && 'justify-center px-2',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />

                    <AnimatePresence initial={false}>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="truncate overflow-hidden whitespace-nowrap flex-1"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Cart badge on POS link */}
                    <AnimatePresence>
                      {isPOS && cartCount > 0 && (
                        <motion.span
                          key={cartCount}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className={cn(
                            'h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                            active
                              ? 'bg-white text-indigo-600'
                              : 'bg-indigo-600 text-white',
                          )}
                        >
                          {cartCount}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* POS pill badge when not active and not collapsed and no cart items */}
                    <AnimatePresence initial={false}>
                      {!sidebarCollapsed && highlight && !active && cartCount === 0 && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="ml-auto text-[10px] bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
                        >
                          POS
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </nav>

      {/* Tenant Switcher */}
      <div className="relative px-2 py-2 border-t border-white/[0.06]">
        <TenantSwitcher collapsed={sidebarCollapsed} />
      </div>

      {/* Collapse toggle */}
      <div className="relative p-2 border-t border-white/[0.06]">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              sidebarCollapsed && 'rotate-180',
            )}
          />
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
