'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 dark:bg-gray-800 h-56 animate-pulse" />
          ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Try a different search or category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => {
          const inCart = cartItems.find((i) => i.product.id === product.id);
          const lowStock = product.stock <= product.minStock;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.22,
                delay: index * 0.04,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'group relative flex flex-col rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden text-left cursor-pointer',
                'shadow-sm hover:shadow-xl transition-shadow duration-300',
                inCart
                  ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-800',
                product.stock === 0 && 'opacity-50 cursor-not-allowed',
              )}
              onClick={() => {
                if (product.stock !== 0) addItem(product);
              }}
            >
              {/* Cart badge */}
              <AnimatePresence>
                {inCart && (
                  <motion.div
                    key="cart-badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
                  >
                    {inCart.quantity}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Low stock indicator */}
              {lowStock && product.stock > 0 && (
                <div className="absolute top-2 left-2 z-10">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </div>
              )}

              {/* Image */}
              <div className="relative h-36 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-bold tracking-wide">Out of Stock</span>
                  </div>
                )}

                {/* Price badge overlaid bottom-left */}
                <div className="absolute bottom-2 left-2 z-10">
                  <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {formatCurrency(product.price)}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-2">
                  {product.name}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{product.sku}</p>

                {/* Add to cart button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.stock !== 0) addItem(product);
                  }}
                  disabled={product.stock === 0}
                  className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
