// WHY: `'use client'` is a Next.js directive that tells the framework this file runs in the browser
// (the "client"), not on the server. It's required whenever you use React hooks like useState.
'use client';

// WHY: `useState` is a React hook — a special function that lets a component remember values
// between renders. Without it, every re-render would reset variables to their initial values.
import { useState } from 'react';

// WHY: `useRouter` is a Next.js hook that gives us the ability to programmatically navigate
// to a different page (like redirecting to the dashboard after a successful login).
import { useRouter } from 'next/navigation';

// WHY: These are icon components from the `lucide-react` library — they render SVG icons as
// React components, making it easy to place icons inline in JSX.
import { Eye, EyeOff, Zap, AlertCircle, Loader2 } from 'lucide-react';

// WHY: `cn` is a utility function (short for "classnames") that merges Tailwind CSS class strings
// together conditionally — e.g. apply a red border only when there's a validation error.
import { cn } from '@/lib/utils/cn';

// WHY: We import our Zustand auth store so the login page can call the `login` action,
// which handles the API request and stores the tokens globally.
import { useAuthStore } from '@/store/authStore';

// WHY: TypeScript interface for the login form's fields — defining this lets TypeScript catch
// typos like `form.pasword` (missing 's') at compile time before the code runs.
interface FormData {
  email: string;    // WHY: The user's email address input.
  password: string; // WHY: The user's password input.
  remember: boolean; // WHY: Whether the "Remember me" checkbox is checked.
}

// WHY: Separate interface for form validation errors — each field's error message is optional
// (`?`) because not every field will have an error at the same time.
interface FormErrors {
  email?: string;   // WHY: Shown below the email input when the email is missing or malformed.
  password?: string; // WHY: Shown below the password input when the password is invalid.
  general?: string;  // WHY: Shown at the top of the form for errors that aren't field-specific (e.g. wrong credentials).
}

// WHY: Pre-defined demo accounts so developers and testers can log in quickly without remembering
// passwords. Defined outside the component so it's created once, not on every render.
const DEMO_CREDENTIALS = [
  { label: 'Admin', email: 'admin@posapp.com', password: 'Admin@123', role: 'Administrator' },
  { label: 'Manager', email: 'manager@posapp.com', password: 'Manager@123', role: 'Manager' },
  { label: 'Cashier', email: 'cashier@posapp.com', password: 'Cashier@123', role: 'Cashier' },
];

// WHY: `export default` marks this as the main component of this file. Next.js's file-based router
// automatically uses the default export of `app/login/page.tsx` as the page rendered at `/login`.
export default function LoginPage() {
  // WHY: `useRouter()` gives us a `router` object with navigation methods like `router.push('/dashboard')`.
  const router = useRouter();

  // WHY: We read only the `login` function from the auth store. The `(s) => s.login` selector
  // prevents this component from re-rendering when unrelated parts of the store change (like the user object).
  const login = useAuthStore((s) => s.login);

  // WHY: `useState` returns a pair: the current value and a "setter" function. Here we store the
  // form fields as a single object so all three values travel together.
  const [form, setForm] = useState<FormData>({ email: '', password: '', remember: false });

  // WHY: Validation errors live in their own state so they can be updated independently
  // without affecting the form field values.
  const [errors, setErrors] = useState<FormErrors>({});

  // WHY: A boolean state to toggle whether the password input shows plain text or dots.
  const [showPassword, setShowPassword] = useState(false);

  // WHY: A boolean state to disable the submit button and show a spinner while the login
  // request is in-flight, preventing the user from clicking multiple times.
  const [loading, setLoading] = useState(false);

  // WHY: A reusable helper function to update a single field in the form state.
  // `keyof FormData` is TypeScript for "must be one of: 'email' | 'password' | 'remember'".
  const setField = (key: keyof FormData, value: string | boolean) => {
    // WHY: The `(f) => ({ ...f, [key]: value })` pattern is called a "functional update" — we spread
    // the previous form state and override only the one changed field, preserving the others.
    setForm((f) => ({ ...f, [key]: value }));
    // WHY: Clear the error for this field (and any general error) as soon as the user starts typing,
    // so stale error messages don't linger after the user has corrected their input.
    if (key !== 'remember') setErrors((e) => ({ ...e, [key]: undefined, general: undefined }));
  };

  // WHY: Client-side validation runs before the network request so we give instant feedback
  // without waiting for a round-trip to the server.
  const validate = (): FormErrors => {
    const errs: FormErrors = {}; // WHY: Start with an empty errors object; we'll populate it if we find problems.
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      // WHY: This is a regular expression (regex) — a pattern that matches valid email formats.
      // It checks for: "something @ something . something" with no spaces or @ signs in each part.
      errs.email = 'Enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    return errs; // WHY: Return the collected errors so the caller can check if any exist.
  };

  // WHY: `async` because `login(...)` is an async function (it makes a network request) and we
  // need `await` to pause until it's done before deciding where to navigate.
  const handleSubmit = async (e: React.FormEvent) => {
    // WHY: `e.preventDefault()` stops the browser's default form submit behavior, which would
    // reload the entire page. We handle submission ourselves via JavaScript.
    e.preventDefault();
    const errs = validate();
    // WHY: `Object.keys(errs).length` counts how many error fields exist. If greater than 0,
    // validation failed and we display the errors instead of calling the API.
    if (Object.keys(errs).length) {
      setErrors(errs);
      return; // WHY: Early return — stop executing the rest of the function.
    }
    setLoading(true); // WHY: Disable the submit button and show the spinner before the async work starts.
    try {
      // WHY: `.trim()` removes leading/trailing whitespace and `.toLowerCase()` normalizes the
      // email so "User@Example.COM" and "user@example.com" are treated the same.
      await login(form.email.trim().toLowerCase(), form.password);
      // WHY: `router.push('/')` navigates to the dashboard page after a successful login.
      // It runs only after `await login(...)` resolves (doesn't throw).
      router.push('/');
    } catch (err: any) {
      // WHY: If `login(...)` throws (wrong password, server down, etc.), we catch the error
      // and display it as a general error banner at the top of the form.
      setErrors({ general: err.message || 'Invalid email or password.' });
    } finally {
      // WHY: `finally` runs whether the try succeeded or threw — it's the right place to stop
      // the loading spinner so it always disappears, no matter what happened.
      setLoading(false);
    }
  };

  // WHY: When the user clicks a demo credential button, we pre-fill the form fields so they
  // can immediately click "Sign in" without typing. We also clear any existing errors.
  const fillDemo = (cred: (typeof DEMO_CREDENTIALS)[number]) => {
    // WHY: `(typeof DEMO_CREDENTIALS)[number]` is TypeScript for "the type of any single element
    // in the DEMO_CREDENTIALS array" — keeps the type in sync automatically.
    setForm({ email: cred.email, password: cred.password, remember: false });
    setErrors({});
  };

  // WHY: JSX (the HTML-like syntax below) is React's way of describing what the UI should look like.
  // It compiles down to `React.createElement(...)` calls under the hood.
  return (
    // WHY: `min-h-screen` makes this div take up at least the full viewport height.
    // `bg-gradient-to-br` applies a diagonal gradient background for the dark login page design.
    // `flex items-center justify-center` is Flexbox CSS that centers the card both vertically and horizontally.
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background grid */}
      {/* WHY: This decorative div overlays a subtle grid pattern on the background for visual depth. */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* WHY: `relative` positioning is needed here so absolutely-positioned children (like the grid overlay) are scoped to this container. */}
      <div className="relative w-full max-w-md">
        {/* Card */}
        {/* WHY: `rounded-3xl shadow-2xl` creates the white card with rounded corners and a deep shadow to make it "float" above the background. */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-white/10">
          {/* Logo */}
          {/* WHY: `gap-3` adds spacing between the icon and the text inside this flex row. */}
          <div className="flex items-center gap-3 mb-8">
            {/* WHY: This div is the colored icon badge. `shadow-indigo-500/30` is a colored drop-shadow using Tailwind's opacity modifier. */}
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              {/* WHY: `Zap` renders a lightning bolt SVG icon from lucide-react as the app logo. */}
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">POS Enterprise</p>
              <p className="text-xs text-gray-500">Retail Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

          {/* General error */}
          {/* WHY: `{errors.general && (...)}` is JSX conditional rendering — the banner only
              appears in the DOM when `errors.general` is a non-empty string (truthy). */}
          {errors.general && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-5">
              {/* WHY: `shrink-0` prevents the icon from shrinking if the error text is long. */}
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          {/* WHY: `noValidate` disables the browser's built-in HTML5 validation popups so our
              custom validation (the `validate()` function above) handles everything instead. */}
          {/* WHY: `onSubmit={handleSubmit}` wires the form's submit event to our async handler function. */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email" // WHY: Tells the browser this is an email field so it can suggest saved emails.
                value={form.email}   // WHY: "Controlled input" — React owns the value; it always reflects `form.email` state.
                onChange={(e) => setField('email', e.target.value)} // WHY: Every keystroke calls `setField` to update state, keeping React in sync with what the user typed.
                placeholder="you@example.com"
                // WHY: `cn(...)` merges class strings conditionally — the border turns red when
                // `errors.email` is truthy, giving visual feedback on the specific broken field.
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-offset-0',
                  errors.email
                    ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500',
                )}
              />
              {/* WHY: Same conditional rendering pattern — only show the error text when it exists. */}
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                {/* WHY: `type="button"` is critical here — without it, any button inside a <form>
                    defaults to `type="submit"` and would accidentally submit the form when clicked. */}
                <button
                  type="button"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              {/* WHY: `relative` on this div lets us absolutely position the eye toggle button
                  inside the password input field. */}
              <div className="relative">
                <input
                  // WHY: Toggling `type` between 'password' (shows dots) and 'text' (shows characters)
                  // is the standard way to implement a "show/hide password" feature.
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" // WHY: Tells password managers this is the current password field (not a "new password" field).
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Enter your password"
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 pr-11 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    errors.password
                      ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500',
                  )}
                />
                {/* WHY: The eye button is `absolute` so it floats over the right side of the input.
                    `top-1/2 -translate-y-1/2` centers it vertically within the input field. */}
                <button
                  type="button"
                  // WHY: `(v) => !v` is a toggle — if `showPassword` is true, set it to false, and vice versa.
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {/* WHY: Switch between EyeOff and Eye icons to visually signal the current show/hide state. */}
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.password}
                </p>
              )}
            </div>

            {/* Remember me */}
            {/* WHY: Wrapping in a <label> makes the entire row (including text) clickable to toggle the checkbox. */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative">
                {/* WHY: `sr-only` hides the real checkbox visually but keeps it accessible to screen readers
                    and keyboard navigation — we use a custom-styled div below as the visual replacement. */}
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setField('remember', e.target.checked)}
                  className="sr-only"
                />
                {/* WHY: This div is the visual custom checkbox — its background color switches based on
                    `form.remember` to show checked (indigo) vs unchecked (white/gray) state. */}
                <div className={cn(
                  'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                  form.remember
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
                )}>
                  {/* WHY: The checkmark SVG is only rendered when `form.remember` is true,
                      providing the visual tick inside the custom checkbox. */}
                  {form.remember && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              // WHY: `disabled={loading}` prevents double-submission — while a login request is
              // in progress, the button is greyed out and unclickable.
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all mt-2',
                'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-500/25',
                // WHY: `disabled:` prefix applies these Tailwind classes only when the button is disabled.
                'disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100',
              )}
            >
              {/* WHY: Ternary operator `condition ? a : b` — show spinner + text while loading,
                  otherwise show the normal button text. */}
              {loading ? (
                <>
                  {/* WHY: `animate-spin` is a Tailwind class that applies a CSS rotation animation,
                      making the Loader2 icon spin continuously to indicate work in progress. */}
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to POS'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3 font-medium">
              DEMO ACCOUNTS — click to fill
            </p>
            {/* WHY: `grid-cols-3` creates a 3-column grid layout so all three demo buttons sit side by side. */}
            <div className="grid grid-cols-3 gap-2">
              {/* WHY: `.map()` loops over the DEMO_CREDENTIALS array and renders a button for each item.
                  The `key` prop is required by React to efficiently track list items when they change. */}
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email} // WHY: React needs a unique `key` on each list item to efficiently update the DOM.
                  type="button"
                  onClick={() => fillDemo(cred)} // WHY: Clicking fills the form with this credential's email and password.
                  className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all group"
                >
                  {/* WHY: `group-hover:` classes apply when any element inside the parent with `group` class is hovered — lets child elements react to the parent's hover state. */}
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors">
                    {/* WHY: `cred.label[0]` takes the first character of the label (e.g. "A" for "Admin")
                        as the avatar initial inside the circle. */}
                    {cred.label[0]}
                  </div>
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{cred.label}</span>
                  <span className="text-[9px] text-gray-400">{cred.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-4">
          © 2024 POS Enterprise · All rights reserved
        </p>
      </div>
    </div>
  );
}
