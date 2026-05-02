export type ID = string;

export type Theme = 'light' | 'dark';

// ─── Product ───────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'beverages'
  | 'food'
  | 'electronics'
  | 'clothing'
  | 'accessories'
  | 'beauty'
  | 'home'
  | 'sports'
  | 'other';

export interface Product {
  id: ID;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  image: string;
  description: string;
  taxable: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Cart ──────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // percentage 0-100
  note?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'upi';

export interface CartState {
  items: CartItem[];
  customerId: ID | null;
  discount: number; // order-level % discount
  taxRate: number;
  paymentMethod: PaymentMethod;
  note: string;
}

// ─── Order ─────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'completed' | 'refunded' | 'cancelled';

export interface OrderItem {
  productId: ID;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Order {
  id: ID;
  orderNumber: string;
  customerId: ID | null;
  customerName: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  cashierName: string;
  note: string;
  createdAt: string;
}

// ─── Customer ──────────────────────────────────────────────────────────────

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  tags: string[];
  createdAt: string;
}

export type CustomerFormData = Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'totalOrders' | 'createdAt'>;

// ─── Inventory ─────────────────────────────────────────────────────────────

export interface StockMovement {
  id: ID;
  productId: ID;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  createdAt: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface SalesByCategory {
  category: string;
  revenue: number;
  units: number;
}

export interface TopProduct {
  productId: ID;
  productName: string;
  revenue: number;
  units: number;
}

// ─── Dashboard KPIs ────────────────────────────────────────────────────────

export interface DashboardKPIs {
  todayRevenue: number;
  todayOrders: number;
  todayCustomers: number;
  todayAvgOrder: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  avgOrderChange: number;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  logo: string;
}

export interface TaxSettings {
  enabled: boolean;
  defaultRate: number;
  inclusivePricing: boolean;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  active: boolean;
  createdAt: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}
