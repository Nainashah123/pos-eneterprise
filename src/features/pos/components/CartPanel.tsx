'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Minus,
  Plus,
  Tag,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { PaymentMethod } from '@/types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
];

interface CartPanelProps {
  onCheckout: () => void;
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const {
    items,
    discount,
    taxRate,
    paymentMethod,
    removeItem,
    updateQuantity,
    updateDiscount,
    setOrderDiscount,
    setPaymentMethod,
    clearCart,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    itemCount,
  } = useCartStore();

  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState(discount.toString());

  const applyDiscount = () => {
    const val = Math.min(100, Math.max(0, parseFloat(discountInput) || 0));
    setOrderDiscount(val);
    setDiscountInput(val.toString());
  };

  return (
    <div className="w-[340px] shrink-0 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-indigo-600" />
          <span className="font-semibold text-gray-900 dark:text-white">Cart</span>
          <AnimatePresence mode="popLayout">
            {itemCount() > 0 && (
              <motion.span
                key={itemCount()}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="h-5 w-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center"
              >
                {itemCount()}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="xs" onClick={clearCart} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Customer */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button className="w-full flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <User className="h-4 w-4" />
          <span>Add customer (optional)</span>
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600"
          >
            <ShoppingBag className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium text-gray-500">Cart is empty</p>
            <p className="text-xs text-gray-400 mt-1">Tap products to add</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                layout
                className="flex gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 group"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-12 w-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.product.price)}</p>

                  {item.discount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      -{item.discount}% discount
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-1.5">
                    {/* Qty controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="h-5 w-5 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-gray-800 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="h-5 w-5 rounded-md bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatCurrency(
                          item.product.price * item.quantity * (1 - item.discount / 100),
                        )}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Discount */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setDiscountOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            Order discount {discount > 0 ? `(${discount}%)` : ''}
            {discountOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence initial={false}>
            {discountOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="0-100%"
                  />
                  <Button size="sm" onClick={applyDiscount}>Apply</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Totals */}
      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1.5 text-sm"
          >
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Subtotal</span>
              <motion.span layout key={subtotal()}>
                {formatCurrency(subtotal())}
              </motion.span>
            </div>
            <AnimatePresence initial={false}>
              {discountAmount() > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between text-emerald-600 dark:text-emerald-400"
                >
                  <span>Discount ({discount}%)</span>
                  <span>-{formatCurrency(discountAmount())}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Tax ({taxRate}%)</span>
              <motion.span layout key={taxAmount()}>
                {formatCurrency(taxAmount())}
              </motion.span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-800">
              <span>Total</span>
              <motion.span layout key={total()}>
                {formatCurrency(total())}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment methods */}
      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-t border-gray-200 dark:border-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <motion.button
                  key={m.value}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all border',
                    paymentMethod === m.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700',
                  )}
                >
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCheckout}
          disabled={items.length === 0}
          className={cn(
            'w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-150',
            items.length === 0
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25',
          )}
        >
          {items.length === 0 ? 'Add items to continue' : `Charge ${formatCurrency(total())}`}
        </motion.button>
      </div>
    </div>
  );
}
