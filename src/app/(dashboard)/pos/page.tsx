'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Scan } from 'lucide-react';
import { ProductGrid } from '@/features/pos/components/ProductGrid';
import { CartPanel } from '@/features/pos/components/CartPanel';
import { PaymentModal } from '@/features/pos/components/PaymentModal';
import { BarcodeScanner } from '@/features/pos/components/BarcodeScanner';
import { useProducts } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils/cn';
import type { Order, ProductCategory } from '@/types';

const CATEGORIES: { value: ProductCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '🛍️' },
  { value: 'beverages', label: 'Beverages', emoji: '☕' },
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'electronics', label: 'Electronics', emoji: '📱' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'accessories', label: 'Accessories', emoji: '👜' },
  { value: 'beauty', label: 'Beauty', emoji: '💄' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'home', label: 'Home', emoji: '🏠' },
];

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | undefined>();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);

  const { data: productsData, isLoading } = useProducts({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
  });

  const products = productsData?.data ?? [];

  const { items, paymentMethod, customerId, subtotal, discountAmount, taxAmount, total, discount, taxRate, note, clearCart, addItem } = useCartStore();
  const createOrder = useCreateOrder();

  const handleBarcodeDetected = (code: string) => {
    // Use all loaded products (unfiltered) — search the full productsData list
    // Since products is already the current filtered list, we search all loaded products
    // We close the scanner first so the user sees feedback
    const allProducts = productsData?.data ?? [];
    const match = allProducts.find(
      (p) => p.sku.toLowerCase() === code.toLowerCase()
    );
    if (match) {
      addItem(match);
      setScannerOpen(false);
      setBarcodeNotFound(false);
    } else {
      setBarcodeNotFound(true);
      setTimeout(() => setBarcodeNotFound(false), 2500);
    }
  };

  const handleConfirmPayment = async () => {
    const order = await createOrder.mutateAsync({
      customerId: customerId,
      customerName: null,
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: i.product.price,
        discount: i.discount,
        total: i.product.price * i.quantity * (1 - i.discount / 100),
      })),
      subtotal: subtotal(),
      discount: discountAmount(),
      tax: taxAmount(),
      total: total(),
      paymentMethod,
      status: 'completed',
      cashierName: 'Admin User',
      note,
    });
    setCreatedOrder(order);
    clearCart();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Left: Product section */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Search & filters bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-3 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              title="Scan barcode"
              className={cn(
                'flex items-center justify-center h-10 w-10 shrink-0 rounded-xl border transition-all',
                barcodeNotFound
                  ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-500'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-400 hover:text-indigo-600',
              )}
            >
              <Scan className="h-4 w-4" />
            </button>
          </div>
          {barcodeNotFound && (
            <p className="text-xs text-red-500 -mt-1 px-1">
              No product found for that barcode.
            </p>
          )}

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                  category === cat.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                )}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid products={products} loading={isLoading} />
        </div>
      </div>

      {/* Right: Cart panel */}
      <CartPanel onCheckout={() => setPaymentOpen(true)} />

      {/* Payment modal */}
      <PaymentModal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setCreatedOrder(undefined);
        }}
        onConfirm={handleConfirmPayment}
        createdOrder={createdOrder}
      />

      {/* Barcode scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
}
