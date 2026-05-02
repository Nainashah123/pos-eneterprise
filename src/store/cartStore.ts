import { create } from 'zustand';
import type { CartItem, CartState, Product, PaymentMethod } from '@/types';

interface CartStore extends CartState {
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setOrderDiscount: (discount: number) => void;
  setCustomer: (customerId: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  // computed
  subtotal: () => number;
  discountAmount: () => number;
  taxAmount: () => number;
  total: () => number;
  itemCount: () => number;
}

const DEFAULT_STATE: CartState = {
  items: [],
  customerId: null,
  discount: 0,
  taxRate: 9,
  paymentMethod: 'cash',
  note: '',
};

export const useCartStore = create<CartStore>()((set, get) => ({
  ...DEFAULT_STATE,

  addItem: (product) =>
    set((s) => {
      const existing = s.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          ),
        };
      }
      return { items: [...s.items, { product, quantity: 1, discount: 0 }] };
    }),

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

  updateQuantity: (productId, quantity) =>
    set((s) => ({
      items:
        quantity <= 0
          ? s.items.filter((i) => i.product.id !== productId)
          : s.items.map((i) =>
              i.product.id === productId ? { ...i, quantity } : i,
            ),
    })),

  updateDiscount: (productId, discount) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i,
      ),
    })),

  setOrderDiscount: (discount) => set({ discount }),
  setCustomer: (customerId) => set({ customerId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNote: (note) => set({ note }),

  clearCart: () => set({ ...DEFAULT_STATE }),

  subtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const lineTotal = item.product.price * item.quantity;
      const discounted = lineTotal * (1 - item.discount / 100);
      return sum + discounted;
    }, 0);
  },

  discountAmount: () => {
    const { discount } = get();
    return get().subtotal() * (discount / 100);
  },

  taxAmount: () => {
    const { taxRate, items } = get();
    const taxableSubtotal = items
      .filter((i) => i.product.taxable)
      .reduce((sum, item) => {
        const lineTotal = item.product.price * item.quantity;
        return sum + lineTotal * (1 - item.discount / 100);
      }, 0);
    const afterDiscount = taxableSubtotal * (1 - get().discount / 100);
    return afterDiscount * (taxRate / 100);
  },

  total: () => get().subtotal() - get().discountAmount() + get().taxAmount(),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
