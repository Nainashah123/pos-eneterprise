import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftAddon, rightAddon, wrapperClassName, ...props }, ref) => (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <div className="absolute left-3 text-gray-400">{leftAddon}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors',
            'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
            'dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
            'dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            leftAddon && 'pl-9',
            rightAddon && 'pr-9',
            className,
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 text-gray-400">{rightAddon}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  ),
);

Input.displayName = 'Input';

export { Input };
