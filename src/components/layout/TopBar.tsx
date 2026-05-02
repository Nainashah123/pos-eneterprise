'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Bell, Sun, Moon, ChevronDown,
  User, Settings2, HelpCircle, LogOut, X, Save, WifiOff,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';

const NOTIFICATIONS = [
  { id: 1, text: 'Phone Stand is low on stock (3 units)', time: '2m ago', unread: true },
  { id: 2, text: 'New order #ORD-M4N5O6 received', time: '15m ago', unread: true },
  { id: 3, text: 'Daily report for Jun 10 is ready', time: '1h ago', unread: false },
];

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();

  const [isOffline, setIsOffline] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await logout();
    router.push('/login');
  };

  const MENU_ITEMS = [
    {
      label: 'Profile',
      icon: User,
      onClick: () => { setProfileOpen(false); setProfileModalOpen(true); },
    },
    {
      label: 'Preferences',
      icon: Settings2,
      onClick: () => { setProfileOpen(false); setPrefsModalOpen(true); },
    },
    {
      label: 'Help & Support',
      icon: HelpCircle,
      onClick: () => { setProfileOpen(false); },
    },
  ];

  return (
    <>
      <header className="h-16 shrink-0 flex items-center gap-4 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white min-w-0 truncate mr-auto">
          {title}
        </h1>

        {/* Search */}
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:text-white placeholder:text-gray-400 transition-all"
          />
        </div>

        {/* Offline badge */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800/60"
            >
              <WifiOff className="h-3 w-3" />
              Offline
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0" title="Toggle theme">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative shrink-0" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            className="relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      n.unread && 'bg-indigo-50/50 dark:bg-indigo-950/30',
                    )}
                  >
                    <p className={cn('text-gray-700 dark:text-gray-300', n.unread && 'font-medium text-gray-900 dark:text-white')}>
                      {n.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                <button className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight">{user?.name ?? 'User'}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase() ?? ''}</p>
            </div>
            <ChevronDown className={cn('h-3 w-3 text-gray-400 transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-b border-gray-200 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name ?? 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email ?? ''}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium capitalize">
                  {user?.role?.toLowerCase() ?? ''}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {MENU_ITEMS.map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Preferences Modal */}
      <PreferencesModal
        open={prefsModalOpen}
        onClose={() => setPrefsModalOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </>
  );
}

// ─── Profile Modal ──────────────────────────────────────────────────────────

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when user changes (e.g. modal reopened)
  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (form.newPassword) {
      if (!form.currentPassword) errs.currentPassword = 'Enter current password to change it';
      if (form.newPassword.length < 8) errs.newPassword = 'Min 8 characters';
      if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    try {
      await usersApi.updateMe({ name: form.name, email: form.email });
      if (form.newPassword) {
        await usersApi.changePassword(form.currentPassword, form.newPassword);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="My Profile" size="md">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {form.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{form.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{form.email}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        {apiError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {apiError}
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Account Info</p>
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            error={errors.name}
          />
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            error={errors.email}
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Change Password</p>
          <Input
            label="Current Password"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setField('currentPassword', e.target.value)}
            error={errors.currentPassword}
            placeholder="Enter current password"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={(e) => setField('newPassword', e.target.value)}
              error={errors.newPassword}
              placeholder="Min 8 chars"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Repeat password"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Preferences Modal ──────────────────────────────────────────────────────

function PreferencesModal({
  open, onClose, theme, onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifOrders, setNotifOrders] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Preferences" size="sm">
      <div className="space-y-5">
        {/* Appearance */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Appearance</p>
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { if (theme !== t) onToggleTheme(); }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  theme === t
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                <div className={cn(
                  'h-10 w-full rounded-lg',
                  t === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-900 border border-gray-700',
                )}>
                  <div className={cn('m-2 h-2 w-8 rounded', t === 'light' ? 'bg-gray-200' : 'bg-gray-600')} />
                  <div className={cn('mx-2 h-2 w-12 rounded', t === 'light' ? 'bg-gray-100' : 'bg-gray-700')} />
                </div>
                <span className={cn(
                  'text-xs font-medium capitalize',
                  theme === t ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400',
                )}>
                  {t} Mode {theme === t && '✓'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Notifications</p>
          <div className="space-y-3">
            {[
              { label: 'Email notifications', value: notifEmail, set: setNotifEmail },
              { label: 'Low stock alerts', value: notifLowStock, set: setNotifLowStock },
              { label: 'New order alerts', value: notifOrders, set: setNotifOrders },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  type="button"
                  onClick={() => set(!value)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors duration-200',
                    value ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                    value ? 'translate-x-4' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Preferences</Button>
        </div>
      </div>
    </Modal>
  );
}
