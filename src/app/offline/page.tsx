'use client';

import { WifiOff, RefreshCw, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: '#0f0f14' }}
    >
      <div className="max-w-sm w-full space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-indigo-400" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">You&apos;re Offline</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            No internet connection detected. You can still use the POS terminal with cached data.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-sm text-left">
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Offline Capabilities</p>
          {[
            'Browse cached products',
            'Process sales (syncs when online)',
            'View order history',
            'Access customer records',
          ].map((cap) => (
            <div key={cap} className="flex items-center gap-2 text-gray-300">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              {cap}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/pos"
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            Open POS Terminal
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors border border-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
