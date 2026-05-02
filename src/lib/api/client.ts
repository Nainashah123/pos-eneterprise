import { apiFetch, buildQuery } from './http';
import type {
  Product,
  ProductFormData,
  Order,
  Customer,
  CustomerFormData,
  User,
  DashboardKPIs,
  DailySales,
  SalesByCategory,
  TopProduct,
  StockMovement,
  PaginatedResponse,
  QueryFilters,
  ProductCategory,
  PaymentMethod,
  OrderStatus,
} from '@/types';

// ─── Mappers ───────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ProductCategory> = {
  beverages: 'beverages',
  'food & snacks': 'food',
  food: 'food',
  electronics: 'electronics',
  clothing: 'clothing',
  accessories: 'accessories',
  'beauty & personal care': 'beauty',
  beauty: 'beauty',
  'home & garden': 'home',
  home: 'home',
  'sports & fitness': 'sports',
  sports: 'sports',
};

function mapCategory(name: string): ProductCategory {
  return CATEGORY_MAP[name?.toLowerCase()] ?? 'other';
}

function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: mapCategory(p.category?.name ?? ''),
    price: Number(p.price),
    cost: Number(p.cost),
    stock: p.inventory?.quantity ?? 0,
    minStock: p.inventory?.minQuantity ?? 5,
    image: p.image ?? '',
    description: p.description ?? '',
    taxable: p.taxable,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function mapOrderItem(i: any) {
  return {
    productId: i.productId,
    productName: i.productName,
    sku: i.sku ?? '',
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    discount: Number(i.discount ?? 0),
    total: Number(i.total),
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId ?? null,
    customerName: o.customer?.name ?? null,
    items: (o.items ?? []).map(mapOrderItem),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    paymentMethod: (o.paymentMethod?.toLowerCase() ?? 'cash') as PaymentMethod,
    status: (o.status?.toLowerCase() ?? 'pending') as OrderStatus,
    cashierName: o.cashier?.name ?? '',
    note: o.notes ?? '',
    createdAt: o.createdAt,
  };
}

function mapCustomer(c: any): Customer {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone ?? '',
    address: c.address ?? '',
    loyaltyPoints: c.loyaltyPoints ?? 0,
    totalSpent: Number(c.totalSpent ?? 0),
    totalOrders: c.totalOrders ?? 0,
    tags: c.tags ?? [],
    createdAt: c.createdAt,
  };
}

function mapStockMovement(m: any): StockMovement {
  const typeMap: Record<string, 'in' | 'out' | 'adjustment'> = {
    IN: 'in',
    OUT: 'out',
    ADJUSTMENT: 'adjustment',
  };
  return {
    id: m.id,
    productId: m.productId,
    productName: m.product?.name ?? '',
    type: typeMap[m.type] ?? 'adjustment',
    quantity: m.quantity,
    reason: m.reason ?? '',
    createdAt: m.createdAt,
  };
}

function mapUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role?.toLowerCase() as User['role'],
    avatar: u.avatar ?? '',
    active: u.active,
    createdAt: u.createdAt,
  };
}

interface BackendPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function mapPage<TRaw, TFront>(
  res: BackendPage<TRaw>,
  mapper: (item: TRaw) => TFront,
): PaginatedResponse<TFront> {
  return {
    data: res.data.map(mapper),
    total: res.total,
    page: res.page,
    pageSize: res.limit,
    totalPages: res.totalPages,
  };
}

// ─── Products ──────────────────────────────────────────────────────────────

export const productsApi = {
  async getAll(filters?: QueryFilters): Promise<PaginatedResponse<Product>> {
    const { search, page = 1, pageSize = 20, category } = filters ?? {};
    const q = buildQuery({ search, page, limit: pageSize });
    const res = await apiFetch<BackendPage<any>>(`/products${q}`);
    const mapped = mapPage(res, mapProduct);

    if (category) {
      const filtered = mapped.data.filter((p) => p.category === category);
      return { ...mapped, data: filtered, total: filtered.length };
    }
    return mapped;
  },

  async getById(id: string): Promise<Product> {
    const raw = await apiFetch<any>(`/products/${id}`);
    return mapProduct(raw);
  },

  async create(data: ProductFormData): Promise<Product> {
    const raw = await apiFetch<any>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price,
        cost: data.cost,
        taxable: data.taxable,
        active: data.active,
        categoryName: data.category,
        initialStock: data.stock,
        minQuantity: data.minStock,
      }),
    });
    return mapProduct(raw);
  },

  async update(id: string, data: Partial<ProductFormData>): Promise<Product> {
    const raw = await apiFetch<any>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.name && { name: data.name }),
        ...(data.sku && { sku: data.sku }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.taxable !== undefined && { taxable: data.taxable }),
        ...(data.active !== undefined && { active: data.active }),
      }),
    });
    return mapProduct(raw);
  },

  async delete(id: string): Promise<void> {
    await apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
  },
};

// ─── Orders ────────────────────────────────────────────────────────────────

export const ordersApi = {
  async getAll(filters?: QueryFilters): Promise<PaginatedResponse<Order>> {
    const { search, page = 1, pageSize = 10, status } = filters ?? {};
    const q = buildQuery({
      search,
      page,
      limit: pageSize,
      ...(status && { status: String(status).toUpperCase() }),
    });
    const res = await apiFetch<BackendPage<any>>(`/orders${q}`);
    return mapPage(res, mapOrder);
  },

  async getById(id: string): Promise<Order> {
    const raw = await apiFetch<any>(`/orders/${id}`);
    return mapOrder(raw);
  },

  async create(data: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order> {
    const discountPct = data.subtotal > 0 ? (data.discount / data.subtotal) * 100 : 0;
    const raw = await apiFetch<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: data.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        customerId: data.customerId ?? undefined,
        discountPct: discountPct > 0 ? discountPct : undefined,
        paymentMethod: data.paymentMethod.toUpperCase(),
        notes: data.note || undefined,
      }),
    });
    return mapOrder(raw);
  },
};

// ─── Customers ─────────────────────────────────────────────────────────────

export const customersApi = {
  async getAll(filters?: QueryFilters): Promise<PaginatedResponse<Customer>> {
    const { search, page = 1, pageSize = 10 } = filters ?? {};
    const q = buildQuery({ search, page, limit: pageSize });
    const res = await apiFetch<BackendPage<any>>(`/customers${q}`);
    return mapPage(res, mapCustomer);
  },

  async getById(id: string): Promise<Customer> {
    const raw = await apiFetch<any>(`/customers/${id}`);
    return mapCustomer(raw);
  },

  async create(data: CustomerFormData): Promise<Customer> {
    const raw = await apiFetch<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapCustomer(raw);
  },

  async update(id: string, data: Partial<CustomerFormData>): Promise<Customer> {
    const raw = await apiFetch<any>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return mapCustomer(raw);
  },

  async delete(id: string): Promise<void> {
    await apiFetch<void>(`/customers/${id}`, { method: 'DELETE' });
  },
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  async getKPIs(): Promise<DashboardKPIs> {
    const raw = await apiFetch<any>('/reports/kpis');
    return {
      todayRevenue: Number(raw.todayRevenue ?? 0),
      todayOrders: raw.todayOrders ?? 0,
      todayCustomers: raw.todayCustomers ?? 0,
      todayAvgOrder: Number(raw.todayAvgOrder ?? 0),
      revenueChange: Number(raw.revenueChange ?? 0),
      ordersChange: Number(raw.ordersChange ?? 0),
      customersChange: Number(raw.customersChange ?? 0),
      avgOrderChange: Number(raw.avgOrderChange ?? 0),
    };
  },

  async getDailySales(): Promise<DailySales[]> {
    const raw = await apiFetch<any[]>('/reports/daily-sales');
    return (raw ?? []).map((r) => ({
      date: r.date,
      revenue: Number(r.revenue ?? 0),
      orders: r.orders ?? 0,
      customers: r.customers ?? 0,
    }));
  },

  async getSalesByCategory(): Promise<SalesByCategory[]> {
    const raw = await apiFetch<any[]>('/reports/by-category');
    return (raw ?? []).map((r) => ({
      category: r.category ?? r.name ?? '',
      revenue: Number(r.revenue ?? 0),
      units: r.units ?? r.quantity ?? 0,
    }));
  },

  async getTopProducts(): Promise<TopProduct[]> {
    const raw = await apiFetch<any[]>('/reports/top-products');
    return (raw ?? []).map((r) => ({
      productId: r.productId,
      productName: r.productName ?? r.name ?? '',
      revenue: Number(r.revenue ?? 0),
      units: r.units ?? r.quantity ?? 0,
    }));
  },

  async getRecentOrders(): Promise<Order[]> {
    const res = await ordersApi.getAll({ pageSize: 5 });
    return res.data;
  },
};

// ─── Reports ───────────────────────────────────────────────────────────────

export const reportsApi = {
  async getDailySales(range?: { from: string; to: string }): Promise<DailySales[]> {
    const q = range ? buildQuery({ from: range.from, to: range.to }) : '';
    const raw = await apiFetch<any[]>(`/reports/daily-sales${q}`);
    return (raw ?? []).map((r) => ({
      date: r.date,
      revenue: Number(r.revenue ?? 0),
      orders: r.orders ?? 0,
      customers: r.customers ?? 0,
    }));
  },

  async getSalesByCategory(): Promise<SalesByCategory[]> {
    return dashboardApi.getSalesByCategory();
  },

  async getTopProducts(): Promise<TopProduct[]> {
    return dashboardApi.getTopProducts();
  },
};

// ─── Inventory ─────────────────────────────────────────────────────────────

export const inventoryApi = {
  async getLowStockProducts(): Promise<Product[]> {
    const raw = await apiFetch<any[]>('/inventory/low-stock');
    return (raw ?? []).map((item) => mapProduct(item.product ?? item));
  },

  async getStockMovements(): Promise<StockMovement[]> {
    const raw = await apiFetch<any[]>('/inventory/movements');
    return (raw ?? []).map(mapStockMovement);
  },

  async adjustStock(productId: string, qty: number, reason: string): Promise<Product> {
    const raw = await apiFetch<any>(`/inventory/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ quantity: qty, reason, type: qty > 0 ? 'IN' : 'OUT' }),
    });
    return mapProduct(raw.product ?? raw);
  },
};

// ─── Users ─────────────────────────────────────────────────────────────────

export const usersApi = {
  async getAll(): Promise<User[]> {
    const raw = await apiFetch<any[]>('/users');
    return (raw ?? []).map(mapUser);
  },
};
