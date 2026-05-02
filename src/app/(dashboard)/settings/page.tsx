'use client';
// WHY: 'use client' tells Next.js this page uses browser-only features (React hooks,
// event handlers). Without this, Next.js would try to render it on the server where
// hooks like useState don't work.

import { useState, useEffect } from 'react';
// WHY: useState — lets us remember values between re-renders (e.g. which tab is active).
// useEffect — lets us run code in response to something changing (e.g. when API data arrives,
// copy it into the form fields). Think of useEffect as "do this as a side effect of that".

import { Store, CreditCard, Users, Save, Shield, Plus, X } from 'lucide-react';
// WHY: Icons from lucide-react make the UI immediately understandable at a glance.
// We import only the icons we use to keep the bundle small.

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
// WHY: All shared UI components live in @/components/ui/. Using them everywhere ensures
// consistent visuals (same border radius, same font size, same hover states) across the app.
// The Table family of components (Table/Thead/Tbody etc.) map to HTML's <table>,
// <thead>, <tbody>, <tr>, <th>, <td> but with pre-applied dark mode and styling.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// WHY: These three are from React Query — a library for managing server data in React.
//   - useQuery: Fetches data from the API, caches it, and tracks loading/error states.
//     Without React Query you'd need useState + useEffect + manual loading/error flags.
//   - useMutation: Sends data-changing requests (POST/PATCH/DELETE). Tracks loading/error.
//   - useQueryClient: Lets you interact with React Query's cache — e.g. invalidate (clear)
//     cached data so the next render fetches fresh data from the server.

import { usersApi, storesApi } from '@/lib/api/client';
// WHY: These are our API client functions. Instead of writing raw fetch() calls everywhere,
// we centralize all API calls here. If the API URL changes, we only update one file.

import { useAuthStore } from '@/store/authStore';
// WHY: useAuthStore is a Zustand hook that reads global auth state.
// It gives us the currently logged-in user's data (role, storeId, email, etc.).
// We need the storeId to know which store's settings to load.

import { formatDate } from '@/lib/utils/format';
// WHY: Converts raw ISO date strings (like "2024-01-15T00:00:00Z") into human-readable
// strings like "Jan 15, 2024". Never format dates manually — locale rules are complex.

import { cn } from '@/lib/utils/cn';
// WHY: cn() (classnames) merges Tailwind CSS class strings conditionally.
// Example: cn('base-class', condition && 'conditional-class') — cleaner than template literals.

import type { UserRole } from '@/types';
// WHY: UserRole is a TypeScript type ('admin' | 'manager' | 'cashier').
// Importing it as "type" means it's erased at runtime — it's purely for type-checking.

// WHY: "as const" freezes this array — TypeScript treats each element as a literal type
// ('Store' | 'Tax' | 'Users') instead of just `string[]`. This lets us use it as a type below.
const TABS = ['Store', 'Tax', 'Users'] as const;

// WHY: typeof TABS[number] extracts the union type of array values: 'Store' | 'Tax' | 'Users'.
// Using this as the type for our tab state means TypeScript errors if you ever set tab to
// something that isn't one of these three strings — a compile-time safety net.
type Tab = typeof TABS[number];

// WHY: This maps each role to a Badge color variant.
// Record<UserRole, 'primary' | 'warning' | 'default'> means every role MUST have an entry —
// TypeScript will error if you add a new role and forget to add it here.
const ROLE_VARIANTS: Record<UserRole, 'primary' | 'warning' | 'default'> = {
  admin: 'primary',    // WHY: Blue/indigo for highest privilege — stands out
  manager: 'warning',  // WHY: Amber/yellow for mid-level — noticeable but not alarming
  cashier: 'default',  // WHY: Gray for lowest privilege — subtle
};

export default function SettingsPage() {
  // WHY: 'tab' tracks which settings section the user is viewing.
  // useState<Tab>('Store') initializes to the Store tab — it's the first one the user sees.
  const [tab, setTab] = useState<Tab>('Store');

  // WHY: 'saved' is a boolean that triggers the "Saved!" flash on the button.
  // It's set to true after a successful save, then automatically reset to false after 2 seconds.
  const [saved, setSaved] = useState(false);

  // WHY: 'saving' tracks whether a save API call is currently in-flight.
  // We use it to show a loading spinner and prevent the user from clicking Save multiple times.
  const [saving, setSaving] = useState(false);

  // WHY: 'apiError' stores error messages from failed API calls.
  // It starts as empty string (no error). When a save fails, we display this to the user.
  const [apiError, setApiError] = useState('');

  // WHY: 'inviteOpen' controls whether the "Invite User" modal is visible.
  // Modals are hidden by default (false) and shown when the user clicks "Invite User".
  const [inviteOpen, setInviteOpen] = useState(false);

  // WHY: 'editUser' stores the user object being edited.
  // null means no edit is happening (modal is closed). Setting it to a user opens the EditUserModal.
  // 'any' type is used here because we don't have a strict User type in this file.
  const [editUser, setEditUser] = useState<any | null>(null);

  // WHY: useAuthStore() reads the globally stored logged-in user info.
  // We need this to know which store to fetch settings for, and what the user is allowed to do.
  const { user: authUser } = useAuthStore();

  // WHY: storeId comes from the logged-in user's JWT token.
  // All API calls are scoped to this storeId — you can only see/edit YOUR store.
  // ?? '' means "use empty string if authUser is null (not logged in yet)".
  const storeId = authUser?.storeId ?? '';

  // WHY: isAdmin is a computed boolean used to show/hide admin-only UI elements.
  // For example, only admins see the "Invite User" button and Actions column.
  const isAdmin = authUser?.role === 'ADMIN';

  // WHY: useQueryClient() gives us a handle to React Query's internal cache.
  // We use it to call qc.invalidateQueries() after mutations to force fresh data from the API.
  const qc = useQueryClient();

  // WHY: useQuery fetches the user list from the API and caches it.
  // queryKey: ['users'] — a unique cache key. React Query uses this to identify and cache
  //   the result. If another component also uses ['users'], they share the same cached data.
  // queryFn: the function to call to fetch the data. React Query calls this automatically.
  // The returned { data, isLoading } give us the fetched users and a loading flag.
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  // WHY: A second useQuery for store data. Notice 'enabled: !!storeId' —
  // this prevents the query from running until storeId has a real value.
  // !!storeId converts the string to boolean: !!'' = false (don't fetch), !!'abc' = true (fetch).
  // We need this guard because on initial render, authUser might not be loaded yet.
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', storeId],  // WHY: Including storeId in the key means if storeId changes,
                                    // React Query knows to re-fetch for the new store.
    queryFn: () => storesApi.getById(storeId),
    enabled: !!storeId,            // WHY: Don't fetch if storeId is empty string
  });

  // WHY: These local state objects hold the form field values while the user is editing.
  // They're separate from the API data ('store') so the user can type freely without
  // immediately affecting the cached data. The save button commits the changes.
  const [storeForm, setStoreForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });

  const [taxForm, setTaxForm] = useState({ taxRate: 0 });

  // WHY: useEffect runs AFTER React renders, when the listed dependencies change.
  // [store] means "run this effect whenever 'store' changes".
  // When the API returns store data, we copy it into the form fields so the user sees
  // their current settings pre-filled. We can't do this at useState initialization time
  // because 'store' is undefined on the first render (data hasn't arrived yet).
  useEffect(() => {
    if (store) {
      // WHY: Only update the form if we have data. The 'if (store)' guard prevents
      // overwriting user's typing if the query somehow re-runs while they're editing.
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
  }, [store]); // WHY: The dependency array tells React when to re-run this effect.
               // Without [store], this would run after EVERY render (too often).
               // With [store], it only runs when the 'store' variable changes.

  // WHY: async function for saving store settings. We use try/catch to handle errors
  // gracefully — if the API fails, show an error message instead of crashing.
  const handleSaveStore = async () => {
    // WHY: Permission check — only admins and managers can save store settings.
    // If somehow a cashier triggers this, we return early without doing anything.
    if (!isAdmin && authUser?.role !== 'MANAGER') return;
    setSaving(true);   // WHY: Show spinner on save button
    setApiError('');   // WHY: Clear any previous error from a prior failed attempt
    try {
      await storesApi.update(storeId, storeForm); // WHY: Send updated data to the backend API
      setSaved(true);  // WHY: Flash "Saved!" on the button to confirm success
      // WHY: setTimeout schedules a function to run after 2000ms (2 seconds).
      // After 2 seconds, reset 'saved' so the button goes back to "Save Changes".
      // This is a simple user feedback pattern — show success briefly, then return to normal.
      setTimeout(() => setSaved(false), 2000);
      // WHY: invalidateQueries tells React Query that the cached store data is now stale.
      // React Query will re-fetch the store data automatically on the next render, keeping
      // the UI in sync with what we just saved.
      qc.invalidateQueries({ queryKey: ['store', storeId] });
    } catch (err: any) {
      // WHY: err.message is the error string from the API or network.
      // "?? 'Failed to save'" is the fallback if err.message doesn't exist.
      setApiError(err.message ?? 'Failed to save');
    } finally {
      // WHY: 'finally' runs regardless of success or failure — always stop the spinner.
      setSaving(false);
    }
  };

  // WHY: Same pattern as handleSaveStore but only sends the tax rate.
  // We make separate save functions because Store tab and Tax tab save different fields.
  const handleSaveTax = async () => {
    if (!isAdmin && authUser?.role !== 'MANAGER') return;
    setSaving(true);
    setApiError('');
    try {
      // WHY: We only send taxRate, not the full storeForm, because this is the Tax tab.
      // Sending only changed fields (partial update) is more efficient and less risky.
      await storesApi.update(storeId, { taxRate: taxForm.taxRate });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // WHY: No invalidateQueries here — tax rate change doesn't need to refresh the store
      // query since the current form state is already updated locally.
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // WHY: useMutation is React Query's way to run data-changing operations.
  // Unlike useQuery (which runs automatically), mutations only run when you call .mutate().
  // mutationFn: the function to call — here, toggle a user's active status.
  // onSuccess: runs AFTER the mutation succeeds. We invalidate the users cache so the
  //   table re-fetches with the updated user status (active → inactive or vice versa).
  const toggleMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    // WHY: After toggling a user, we must refresh the user list. Without invalidateQueries,
    // the table would still show the old status (cached data) even though the DB changed.
  });

  return (
    <div className="max-w-3xl space-y-5">
      {/* Tab nav — the pill-style tab switcher at the top */}
      {/* WHY: The outer div with bg-gray-100 creates the "pill container" background.
          Each tab button switches the 'tab' state, which controls which content renders below. */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {/* WHY: TABS.map() renders a button for each tab name dynamically.
            If you add a new tab to the TABS array above, a button appears automatically. */}
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setApiError(''); setSaved(false); }}
            // WHY: cn() merges class names. The active tab gets a white background + shadow
            // (the "selected pill" effect). Inactive tabs show a subtle hover color.
            // tab === t is the condition: is this button the currently selected tab?
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {/* WHY: Conditional rendering with && — each condition checks which tab this
                button represents and renders the matching icon. Only one will render per button.
                This is cleaner than a switch statement for simple cases. */}
            {t === 'Store' && <Store className="h-4 w-4" />}
            {t === 'Tax' && <CreditCard className="h-4 w-4" />}
            {t === 'Users' && <Users className="h-4 w-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* WHY: Global error banner — appears below the tabs if any save operation fails.
          apiError && (...) means "only render this div if apiError is a non-empty string".
          Empty string is falsy in JavaScript, so when there's no error, nothing renders. */}
      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {apiError}
        </div>
      )}

      {/* Store settings — only rendered when tab === 'Store' */}
      {/* WHY: tab === 'Store' && (...) is conditional rendering — the entire Store Card
          only exists in the DOM when the Store tab is active. React unmounts it when you
          switch to another tab, which also resets any temporary input state. */}
      {tab === 'Store' && (
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          {/* WHY: While storeLoading is true (API hasn't responded yet), we show skeleton
              loaders — empty animated gray boxes where the inputs will appear.
              animate-pulse makes them fade in and out, signalling to users that data is loading.
              This is better UX than showing a blank form or a spinner blocking the whole page. */}
          {storeLoading ? (
            <div className="space-y-4">
              {/* WHY: Array(4).fill(0).map(...) creates 4 identical skeleton placeholder divs.
                  This is a quick way to render N identical elements without a real data array. */}
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
                  // WHY: Spread update pattern: (f) => ({ ...f, name: e.target.value })
                  // copies all existing storeForm fields (...f) and updates just 'name'.
                  // Without the spread, you'd overwrite the whole object and lose other fields.
                  onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"   // WHY: type="email" tells the browser to validate email format
                  value={storeForm.email}
                  onChange={(e) => setStoreForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Select
                  label="Currency"
                  value={storeForm.currency}
                  onChange={(e) => setStoreForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {/* WHY: We list a few currencies. The value is the currency code (INR, USD),
                      and the displayed text is a human-readable description. */}
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                </Select>
                <Select
                  label="Timezone"
                  value={storeForm.timezone}
                  onChange={(e) => setStoreForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  {/* WHY: Timezone affects how dates/times are displayed in reports.
                      A store in India should see "9:00 AM IST", not "3:30 AM UTC". */}
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Store Address
                </label>
                {/* WHY: Textarea for address because it often spans multiple lines
                    (street, city, state, PIN code). resize-none keeps layout predictable. */}
                <textarea
                  value={storeForm.address}
                  onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                {/* WHY: loading={saving} shows a spinner on the button while the API call runs.
                    This prevents double-clicking and shows the user something is happening. */}
                <Button onClick={handleSaveStore} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                  {/* WHY: Ternary — show "Saved!" briefly after success, then back to "Save Changes" */}
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tax settings — only rendered when tab === 'Tax' */}
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
                // WHY: Number() converts the string input value to a number.
                // Similar to parseFloat() but without the decimal precision option.
                onChange={(e) => setTaxForm({ taxRate: Number(e.target.value) })}
                min="0"
                max="100"   // WHY: HTML5 validation — tax rates must be between 0% and 100%
              />
              {/* WHY: Tax type is a UI-only select (not wired to state) — it's a placeholder
                  for a future feature where different tax types have different calculation rules. */}
              <Select label="Tax Type">
                <option>GST (Goods &amp; Services Tax)</option>
                {/* WHY: &amp; is the HTML entity for "&". In JSX, you must use &amp; inside
                    attribute-like contexts to prevent the HTML parser from misreading it. */}
                <option>VAT (Value Added Tax)</option>
                <option>Sales Tax</option>
              </Select>
            </div>

            {/* WHY: Custom toggle switch built with Tailwind CSS. It's a checkbox
                visually styled to look like an iOS-style toggle. The 'sr-only' class hides
                the real checkbox visually (but screen readers can still find it for accessibility).
                peer-checked:* classes apply styles when the checkbox is checked. */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Inclusive Pricing</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Display prices with tax included
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                {/* WHY: This <div> is the visual toggle pill. It's positioned relative to the
                    label so the hidden checkbox still receives click events (accessibility).
                    peer-checked:after:translate-x-5 moves the white circle to the right when checked.
                    peer-checked:bg-indigo-600 turns it blue when checked. */}
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

      {/* Users & roles — only rendered when tab === 'Users' */}
      {tab === 'Users' && (
        // WHY: padding="none" overrides the Card's default padding so we can control
        // padding ourselves — the Table needs to go edge-to-edge inside the card.
        <Card padding="none">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Users &amp; Roles</h3>
            {/* WHY: isAdmin && (...) — only admins can invite new users, so we only render
                the button for admins. Managers and cashiers won't see this button at all. */}
            {isAdmin && (
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
                Invite User
              </Button>
            )}
          </div>

          {/* Role permissions info cards */}
          {/* WHY: This section explains what each role can do. It helps admins understand
              the implications of assigning a role when they invite or edit a user. */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3">
            {/* WHY: We define the role cards as an array of objects and .map() over them.
                This is cleaner than writing three identical-looking JSX blocks by hand.
                If you add a new role, just add one object to this array. */}
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
                {/* WHY: perms.map() renders each permission as a bullet point list item.
                    The • character is a Unicode bullet, used here as a simple visual list marker. */}
                <ul className="space-y-0.5">
                  {perms.map((p) => (
                    <li key={p} className="text-[10px] text-gray-500 dark:text-gray-400">• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Users table */}
          <Table>
            <Thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                {/* WHY: The Actions column header only renders for admins — non-admins
                    can't perform any actions, so showing the column would be misleading. */}
                {isAdmin && <Th>Actions</Th>}
              </tr>
            </Thead>
            <Tbody>
              {/* WHY: Ternary renders skeleton rows while loading, then real data after.
                  This prevents the table from looking empty or broken during the API call. */}
              {usersLoading
                ? Array(4).fill(0).map((_, i) => (
                    <Tr key={i}>
                      {/* WHY: colSpan={5} makes the skeleton cell span all 5 columns
                          so the animated placeholder stretches the full table width. */}
                      <Td colSpan={5}>
                        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </Td>
                    </Tr>
                  ))
                : users?.map((user) => (
                    // WHY: key={user.id} uses the unique database ID. This is better than
                    // using the array index (key={i}) because if the list order changes,
                    // React correctly tracks each user row without re-rendering everything.
                    <Tr key={user.id}>
                      <Td>
                        {/* WHY: The avatar circle shows the first letter of the user's name.
                            charAt(0) extracts the first character. This is a common pattern
                            for avatars when there's no profile photo. */}
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
                        {/* WHY: ROLE_VARIANTS[user.role] looks up the correct color variant
                            for each role using our lookup object defined at the top. */}
                        <Badge variant={ROLE_VARIANTS[user.role]} className="capitalize">
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        {/* WHY: Ternary conditional rendering — show green "Active" badge
                            or gray "Inactive" badge based on user.active boolean.
                            'dot' prop adds a small colored circle before the text. */}
                        {user.active ? (
                          <Badge variant="success" dot>Active</Badge>
                        ) : (
                          <Badge variant="default" dot>Inactive</Badge>
                        )}
                      </Td>
                      {/* WHY: formatDate converts the ISO timestamp to a readable date like "Jan 15, 2024" */}
                      <Td className="text-xs text-gray-400">{formatDate(user.createdAt)}</Td>
                      {/* WHY: Admin-only Actions column — only renders for admin users */}
                      {isAdmin && (
                        <Td>
                          <div className="flex items-center gap-2">
                            {/* WHY: Clicking Edit sets 'editUser' to this user object,
                                which causes the EditUserModal to render (see below). */}
                            <Button variant="ghost" size="xs" onClick={() => setEditUser(user)}>Edit</Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              // WHY: .mutate(user.id) triggers the toggleMutation.
                              // React Query calls mutationFn(user.id) and then runs onSuccess.
                              onClick={() => toggleMutation.mutate(user.id)}
                              // WHY: Dynamic color — red for active users (deactivate is a destructive action),
                              // green for inactive users (activate is a positive action).
                              className={user.active ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'}
                            >
                              {/* WHY: Button label flips based on user's current status —
                                  you deactivate an active user, and activate an inactive one. */}
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

      {/* Invite user modal — always mounted, visibility controlled by 'inviteOpen' state */}
      {/* WHY: We pass an 'onCreated' callback that does two things:
          1. invalidateQueries(['users']) — clears the cached user list so it re-fetches
             and the new user appears in the table immediately.
          2. setInviteOpen(false) — closes the modal after successful creation. */}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => { qc.invalidateQueries({ queryKey: ['users'] }); setInviteOpen(false); }}
      />

      {/* Edit user modal — only renders when editUser is not null */}
      {/* WHY: editUser && (...) means "only render EditUserModal when we have a user to edit".
          When editUser is null, the modal component doesn't exist in the DOM at all.
          This also means the modal gets fresh local state each time it opens (useState resets). */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)} // WHY: null clears editUser, unmounting the modal
          onSaved={() => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); }}
          // WHY: After saving, refresh the users list and close the modal.
        />
      )}
    </div>
  );
}

// ─── Invite User Modal ──────────────────────────────────────────────────────
// WHY: This is a sub-component defined in the same file because it's only used here.
// It gets its own component so it has isolated local state (form fields, errors)
// that don't interfere with the parent SettingsPage state.

// WHY: TypeScript inline type annotation for props — a quick alternative to a named interface.
// open: show/hide the modal | onClose: close without saving | onCreated: close after success
function InviteUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  // WHY: Form state for the invite form. Each field starts empty/default.
  // 'CASHIER' is the default role — the safest choice (least permissions) for a new user.
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' });

  // WHY: Local loading/error state — isolated from the parent page's saving/apiError state.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    // WHY: Prevent page reload on form submit — we handle it with JavaScript.
    e.preventDefault();

    // WHY: Manual form validation — checking required fields BEFORE sending to the API.
    // This gives the user instant feedback without a network round-trip.
    // These are "guard clauses" — they return early if conditions aren't met.
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return; }
    if (form.password.length < 8) { setError('Password min 8 characters'); return; }

    setSaving(true);
    setError('');
    try {
      await usersApi.create(form); // WHY: Send the new user data to the backend API
      onCreated(); // WHY: Tell the parent to refresh the users list and close this modal
    } catch (err: any) {
      setError(err.message ?? 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite User" size="sm">
      {/* WHY: onSubmit on <form> fires when Enter is pressed OR the submit button is clicked */}
      <form onSubmit={handleCreate} className="space-y-4">
        {/* WHY: error && (...) — error banner only appears if there's an error string.
            Once the user fixes the issue and resubmits, setError('') clears it. */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {/* WHY: Spread update pattern — (f) => ({ ...f, name: e.target.value }) updates
            only the 'name' field while keeping all other form fields unchanged. */}
        <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        {/* WHY: type="password" masks the input with dots so the password isn't visible on screen */}
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
        <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="CASHIER">Cashier</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <div className="flex gap-3 justify-end pt-2">
          {/* WHY: type="button" prevents Cancel from accidentally submitting the form */}
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create User</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit User Modal ────────────────────────────────────────────────────────
// WHY: Separate component for editing so it has its own local state.
// It receives the existing user data via props and pre-fills the form.

// WHY: 'user: any' uses the 'any' type — this disables TypeScript type checking for 'user'.
// It's a pragmatic choice when you don't have a strict type defined for this data shape.
function EditUserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  // WHY: Pre-fill the form with existing user data — this is the edit form, not a blank create form.
  // user.role?.toUpperCase() ensures the role matches the <option> values (CASHIER, MANAGER, ADMIN).
  // The ?. is optional chaining — safe access in case user.role is somehow undefined.
  // ?? 'CASHIER' is a fallback in case role is missing.
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role?.toUpperCase() ?? 'CASHIER', password: '' });
  // WHY: password starts empty — blank means "don't change the password". Only filled if changing.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // WHY: We build the payload separately so we can conditionally include the password.
      // If password is blank (user didn't change it), we DON'T send it to avoid overwriting
      // their existing password with an empty string.
      const payload: any = { name: form.name, email: form.email, role: form.role };
      // WHY: Only add password to the payload if the user typed something.
      // The backend interprets "password field missing" as "don't change it".
      if (form.password) payload.password = form.password;
      await usersApi.update(user.id, payload); // WHY: Send the PATCH request to update this specific user
      onSaved(); // WHY: Tell parent to refresh the users list and close this modal
    } catch (err: any) {
      setError(err.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    // WHY: open={true} — this modal is always visible when EditUserModal is rendered.
    // The parent controls whether to render it at all (with {editUser && <EditUserModal />}).
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
        {/* WHY: Optional password field — the placeholder text "Leave blank to keep current"
            communicates the behavior clearly: empty = no change, filled = new password. */}
        <Input label="New Password (optional)" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
