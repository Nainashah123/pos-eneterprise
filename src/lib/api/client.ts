// WHY: apiFetch is the low-level HTTP helper that adds the Bearer auth token and
// unwraps the standard { success, data } wrapper the backend puts on every response.
// buildQuery converts a plain JS object into a URL query string like "?search=foo&page=1".
// Importing them here means every API function in this file uses the same base client.
import { apiFetch, buildQuery } from './http';

// WHY: "import type" means we're only importing TypeScript type definitions — not real code.
// These types describe the shape of objects (what fields they have, what types those fields are).
// They exist only during compilation to catch mistakes; they disappear from the final JS bundle.
import type {
  Product,          // WHY: Describes a product object as the frontend uses it.
  ProductFormData,  // WHY: Describes the fields in the "create/edit product" form.
  Order,            // WHY: Describes a sales order object.
  Customer,         // WHY: Describes a customer object.
  CustomerFormData, // WHY: Describes the fields in the "create/edit customer" form.
  User,             // WHY: Describes a user/employee account object.
  DashboardKPIs,    // WHY: Describes today's key performance indicator numbers.
  DailySales,       // WHY: Describes one day's revenue/orders/customers summary.
  SalesByCategory,  // WHY: Describes revenue broken down by product category.
  TopProduct,       // WHY: Describes a product ranked by sales performance.
  StockMovement,    // WHY: Describes one inventory adjustment event (stock in/out).
  PaginatedResponse,// WHY: Generic wrapper for any list response with pagination info.
  QueryFilters,     // WHY: Describes search/filter/pagination options passed to list endpoints.
  ProductCategory,  // WHY: Union type of valid category strings ("beverages", "food", etc.).
  PaymentMethod,    // WHY: Union type of valid payment strings ("cash", "card", "upi", etc.).
  OrderStatus,      // WHY: Union type of valid order status strings ("pending", "completed", etc.).
} from '@/types';

// ─── Mappers ───────────────────────────────────────────────────────────────
// WHY: "Mappers" (also called "transformers") are functions that convert data from
// one shape to another. The backend speaks its own language (UPPER_CASE enums,
// nested objects, Decimal types, different field names). The frontend speaks a different
// language (lowercase enums, flat objects, plain numbers, its own field names).
// Mappers are the translators that sit in between so the rest of the app never has to
// know or care what the backend format looks like.

// WHY: CATEGORY_MAP is a lookup table (a plain object used like a dictionary).
// The keys are category name strings as the backend might send them (e.g., "food & snacks").
// The values are the frontend's canonical category strings (e.g., "food").
// Record<string, ProductCategory> is a TypeScript generic — it means "an object where
// every key is a string and every value is of type ProductCategory".
const CATEGORY_MAP: Record<string, ProductCategory> = {
  beverages: 'beverages',
  'food & snacks': 'food',
  // WHY: "food & snacks" (backend) maps to just "food" (frontend). The frontend uses
  // shorter enum values; the mapper absorbs the difference so no other code needs to.
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
  // WHY: name?.toLowerCase() safely lowercases the string.
  // The ?. is "optional chaining" — if name is null or undefined, it returns undefined
  // instead of crashing. This protects against backend data that omits the category field.
  // CATEGORY_MAP[...] looks up the result in our table above.
  // ?? 'other' is the "nullish coalescing" operator — if the lookup returns undefined
  // (no matching key), fall back to the default value 'other'. This means an unknown
  // category never crashes the app; it just shows up as 'other'.
  return CATEGORY_MAP[name?.toLowerCase()] ?? 'other';
}

// WHY: mapProduct takes a raw backend product object (typed as `any` because we don't
// fully trust the backend's shape) and returns a properly-typed frontend Product object.
// The `any` type tells TypeScript "trust me, I'll handle the type checking manually here".
// The : Product return type annotation means TypeScript will verify the returned object
// matches the Product type — catching any missing or mistyped fields at compile time.
function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: mapCategory(p.category?.name ?? ''),
    // WHY: p.category is a nested object from the backend {id, name}. We only need the
    // name string. p.category?.name safely reads the name (optional chaining in case
    // category is null). ?? '' falls back to empty string if there's no category at all.
    // Then mapCategory() translates the name to our frontend enum value.

    price: Number(p.price),
    // WHY: The backend stores prices as Prisma Decimal objects, not plain JS numbers.
    // Number() converts them to standard JavaScript numbers. Without this, you'd get
    // objects where you expect numbers, breaking math operations and display formatting.

    cost: Number(p.cost),
    // WHY: Same reason as price — Decimal → number conversion.

    stock: p.inventory?.quantity ?? 0,
    // WHY: The backend nests stock info inside an inventory object: { quantity, minQuantity }.
    // The frontend wants a flat 'stock' field directly on the product.
    // p.inventory?.quantity safely reads it (optional chaining prevents crash if no inventory).
    // ?? 0 defaults to 0 if inventory or quantity is missing.

    minStock: p.inventory?.minQuantity ?? 5,
    // WHY: Same flattening as above — minQuantity from nested inventory becomes minStock.
    // Defaults to 5 (a sensible low-stock threshold) if not specified.

    image: p.imageUrl ?? p.image ?? '',
    // WHY: The backend might use 'imageUrl' or 'image' depending on which endpoint.
    // ?? chains multiple fallbacks: try imageUrl first, then image, then empty string.
    // This is the "or" fallback operator — use the first non-null/undefined value.

    description: p.description ?? '',
    // WHY: ?? '' ensures description is always a string, never null/undefined, which
    // would cause errors in components that call .length or render it directly.

    taxable: p.taxable,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// WHY: mapOrderItem maps a single line item in an order (one product, quantity, price).
// We keep it as a separate function so mapOrder can call it in a loop with .map().
function mapOrderItem(i: any) {
  return {
    productId: i.productId,
    productName: i.productName,
    sku: i.sku ?? '',
    // WHY: ?? '' guards against missing sku — some products may not have one.
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    // WHY: Convert Decimal to number, same reason as product prices.
    discount: Number(i.discount ?? 0),
    // WHY: discount might be null or missing; default to 0 (no discount).
    total: Number(i.total),
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId ?? null,
    // WHY: null is fine here — an order can be a guest purchase with no registered customer.
    customerName: o.customer?.name ?? null,
    // WHY: The backend sends customer as a nested object. We flatten it to just the name.
    // Optional chaining (?.name) prevents a crash if customer is null (guest order).
    items: (o.items ?? []).map(mapOrderItem),
    // WHY: o.items ?? [] ensures we always have an array to map over, even if the backend
    // returns null for items. .map(mapOrderItem) runs mapOrderItem on each element.
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    paymentMethod: (o.paymentMethod?.toLowerCase() ?? 'cash') as PaymentMethod,
    // WHY: The backend stores payment methods in UPPER_CASE (e.g., "CASH").
    // The frontend uses lowercase ("cash"). .toLowerCase() does the conversion.
    // ?? 'cash' defaults to cash if somehow the field is missing.
    // as PaymentMethod is a TypeScript "type assertion" — we're telling the compiler
    // "trust us, this lowercase string is a valid PaymentMethod value".
    status: (o.status?.toLowerCase() ?? 'pending') as OrderStatus,
    // WHY: Same pattern — backend "COMPLETED" becomes frontend "completed".
    cashierName: o.cashier?.name ?? '',
    // WHY: Flatten the nested cashier object to just the name string.
    note: o.notes ?? '',
    // WHY: Backend field is 'notes' (plural), frontend uses 'note' (singular). The mapper
    // handles this rename so no other part of the codebase needs to know about it.
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
    // WHY: These three fields default to safe empty/zero values if the backend omits them.
    totalSpent: Number(c.totalSpent ?? 0),
    // WHY: totalSpent might come back as a Decimal or be missing; Number() + ?? 0 handles both.
    totalOrders: c.totalOrders ?? 0,
    tags: c.tags ?? [],
    // WHY: Default to empty array so code that does tags.map() never crashes.
    createdAt: c.createdAt,
  };
}

function mapStockMovement(m: any): StockMovement {
  // WHY: This local lookup table maps UPPER_CASE backend movement types to lowercase frontend types.
  // Same concept as CATEGORY_MAP above — a dictionary for quick O(1) lookups.
  const typeMap: Record<string, 'in' | 'out' | 'adjustment'> = {
    IN: 'in',
    OUT: 'out',
    ADJUSTMENT: 'adjustment',
  };
  return {
    id: m.id,
    productId: m.productId,
    productName: m.product?.name ?? '',
    // WHY: Flatten the nested product object to just the name. Optional chaining + ?? ''
    // handles cases where product might be null (e.g., deleted products).
    type: typeMap[m.type] ?? 'adjustment',
    // WHY: Look up the backend type string in typeMap. If the backend sends an unexpected
    // type we don't recognise, ?? 'adjustment' provides a safe fallback.
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
    // WHY: Backend sends "ADMIN", "MANAGER", "CASHIER". We lowercase to match frontend types.
    // as User['role'] is a TypeScript lookup — it says "this must be one of the valid
    // values defined in the User type's role field".
    avatar: u.avatar ?? '',
    active: u.active,
    createdAt: u.createdAt,
  };
}

// WHY: BackendPage<T> is a TypeScript generic interface describing the pagination wrapper
// the backend sends for list responses. The <T> is a "type parameter" — a placeholder
// that gets replaced with a real type when you use it. For example, BackendPage<Product>
// means a page result where data is an array of Product objects.
// This lets one interface describe pages of any item type without copy-pasting.
interface BackendPage<T> {
  data: T[];        // WHY: The actual items on this page.
  total: number;    // WHY: Total items across ALL pages (e.g., 150 products total).
  page: number;     // WHY: The current page number (1-based).
  limit: number;    // WHY: How many items per page the backend used (backend calls it "limit").
  totalPages: number; // WHY: Total number of pages (= Math.ceil(total / limit)).
}

// WHY: mapPage is a generic function that converts a BackendPage into a PaginatedResponse.
// The key difference: the backend uses the field name 'limit', the frontend uses 'pageSize'.
// <TRaw, TFront> are two type parameters — TRaw is the backend item type, TFront is the
// frontend item type. The mapper function converts one item from TRaw to TFront.
// This single generic function works for products, orders, customers — any paginated list.
function mapPage<TRaw, TFront>(
  res: BackendPage<TRaw>,
  mapper: (item: TRaw) => TFront,
  // WHY: mapper is a function passed as an argument. This is "higher-order functions" —
  // functions that accept other functions as arguments. It lets mapPage work generically
  // without knowing in advance what type of items it's mapping.
): PaginatedResponse<TFront> {
  return {
    data: res.data.map(mapper),
    // WHY: .map(mapper) calls the mapper function on every item in the array,
    // turning an array of raw backend items into an array of clean frontend items.
    total: res.total,
    page: res.page,
    pageSize: res.limit,
    // WHY: Rename 'limit' (backend name) to 'pageSize' (frontend name) here.
    // Every other piece of frontend code uses 'pageSize' consistently.
    totalPages: res.totalPages,
  };
}

// ─── Products ──────────────────────────────────────────────────────────────
// WHY: productsApi is an object that groups all product-related API calls together.
// This pattern (a plain object with async methods) is called a "service object" or "API module".
// It keeps all product API logic in one place — easy to find and maintain.

export const productsApi = {
  // WHY: async means this function returns a Promise — it does something asynchronous
  // (a network request) and the caller must await it to get the result.
  // filters? means the argument is optional (the ? makes it optional in TypeScript).
  async getAll(filters?: QueryFilters): Promise<PaginatedResponse<Product>> {
    // WHY: Destructure the filters object to extract individual values with defaults.
    // If filters is undefined (not passed), ?? {} gives us an empty object to destructure safely.
    // page = 1 and pageSize = 20 are default values used when the caller doesn't specify them.
    const { search, page = 1, pageSize = 20, category } = filters ?? {};

    // WHY: buildQuery builds a URL query string from an object.
    // { search, page, limit: pageSize } renames pageSize to 'limit' because the backend
    // parameter is called 'limit', not 'pageSize'. buildQuery returns "?search=foo&page=1&limit=20".
    const q = buildQuery({ search, page, limit: pageSize });

    // WHY: apiFetch<BackendPage<any>> makes the HTTP GET request to /products?...
    // The <BackendPage<any>> is a TypeScript generic — it tells apiFetch what shape to
    // expect back, so TypeScript can type-check how we use 'res' below.
    const res = await apiFetch<BackendPage<any>>(`/products${q}`);

    // WHY: mapPage transforms the raw backend response into the frontend's PaginatedResponse shape,
    // running mapProduct on every item in the data array.
    const mapped = mapPage(res, mapProduct);

    // WHY: Client-side category filtering — if a category filter was requested, we filter
    // the already-fetched results locally. This is done client-side because the backend
    // /products endpoint doesn't support category filtering via query param.
    if (category) {
      const filtered = mapped.data.filter((p) => p.category === category);
      // WHY: .filter() returns a new array containing only items where the callback returns true.
      // We create a new object with spread ({...mapped}) to preserve the other pagination
      // fields (page, totalPages, etc.) and just override data and total with filtered values.
      return { ...mapped, data: filtered, total: filtered.length };
    }
    return mapped;
  },

  async getById(id: string): Promise<Product> {
    // WHY: Fetch a single product by its ID. The URL uses template literals (`/products/${id}`)
    // to embed the id variable into the string path.
    const raw = await apiFetch<any>(`/products/${id}`);
    // WHY: Run the raw backend object through mapProduct to get a clean frontend Product.
    return mapProduct(raw);
  },

  async create(data: ProductFormData): Promise<Product> {
    const raw = await apiFetch<any>('/products', {
      method: 'POST',
      // WHY: HTTP POST sends data to create a new resource. We need to specify method: 'POST'
      // because apiFetch defaults to GET.

      body: JSON.stringify({
        // WHY: JSON.stringify converts the JavaScript object to a JSON string, which is what
        // HTTP request bodies must be. The backend reads this JSON and creates the product.
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price,
        cost: data.cost,
        taxable: data.taxable,
        active: data.active,
        categoryName: data.category,
        // WHY: The backend expects 'categoryName' (it looks up or creates the category by name).
        // The form data has 'category'. We rename it here in the request body.
        initialStock: data.stock,
        // WHY: On creation, the backend expects 'initialStock' to set the opening inventory.
        // The frontend form uses 'stock'. We rename it here.
        minStock: data.minStock,
        imageUrl: data.image || undefined,
        // WHY: || undefined means: if data.image is an empty string (falsy), send undefined instead.
        // undefined fields are omitted by JSON.stringify, so we don't send an empty imageUrl field.
        // || differs from ?? here: || treats empty string as falsy; ?? only treats null/undefined.
      }),
    });
    return mapProduct(raw);
    // WHY: The backend returns the newly created product. We map it before returning
    // so the caller always gets a clean frontend Product, never a raw backend object.
  },

  async update(id: string, data: Partial<ProductFormData>): Promise<Product> {
    // WHY: Partial<ProductFormData> means every field in ProductFormData is optional.
    // This allows updates to send only the changed fields, not the entire product object.
    const raw = await apiFetch<any>(`/products/${id}`, {
      method: 'PATCH',
      // WHY: PATCH means "update part of a resource" (vs PUT which replaces the whole thing).
      body: JSON.stringify({
        // WHY: Each field uses spread conditional syntax: ...(condition && { key: value }).
        // This only includes the field in the JSON body if it has a value.
        // Example: if data.name is undefined (not being updated), { name: undefined } is
        // omitted entirely from the request. This prevents accidentally wiping fields.
        ...(data.name && { name: data.name }),
        ...(data.sku && { sku: data.sku }),
        ...(data.description !== undefined && { description: data.description }),
        // WHY: description uses !== undefined (not just truthy) because an empty string ""
        // is a valid description (user intentionally cleared it). && would skip empty strings.
        ...(data.price !== undefined && { price: data.price }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.taxable !== undefined && { taxable: data.taxable }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.image !== undefined && { imageUrl: data.image || null }),
        // WHY: imageUrl: data.image || null — if image is empty string, send null to the backend
        // (telling it to remove the image). null in JSON is explicit "clear this field".
      }),
    });
    return mapProduct(raw);
  },

  async delete(id: string): Promise<void> {
    // WHY: Promise<void> means this async function resolves with no return value.
    // We just need to know if the delete succeeded or failed — no data comes back.
    await apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
    // WHY: HTTP DELETE asks the server to remove the resource at that URL.
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
      // WHY: The backend's order status filter expects UPPER_CASE strings ("COMPLETED").
      // The frontend stores status in lowercase ("completed"). We convert here.
      // ...(status && {...}) only adds the status param if a status filter was provided.
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
    // WHY: Omit<Order, 'id' | 'orderNumber' | 'createdAt'> is a TypeScript utility type.
    // It creates a new type that is exactly Order but with those three fields removed.
    // We omit them because when creating a new order, the backend generates these automatically
    // — we don't have them yet and shouldn't be required to provide them.

    const discountPct = data.subtotal > 0 ? (data.discount / data.subtotal) * 100 : 0;
    // WHY: The backend expects a discount as a percentage (e.g., 10 = 10% off).
    // The frontend has the absolute discount amount and subtotal. We convert here.
    // The ternary (condition ? A : B) guards against division by zero when subtotal is 0.

    const raw = await apiFetch<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: data.items.map((i) => ({
          // WHY: Transform each order item to only the fields the backend needs.
          // We don't send derived fields like unitPrice or total — the backend calculates those.
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        customerId: data.customerId ?? undefined,
        // WHY: ?? undefined: if customerId is null (guest order), send undefined so
        // JSON.stringify omits it entirely (rather than sending "customerId": null).
        discountPct: discountPct > 0 ? discountPct : undefined,
        // WHY: Only include discountPct if there actually is a discount. Omit it otherwise.
        paymentMethod: data.paymentMethod.toUpperCase(),
        // WHY: Frontend stores "cash", backend expects "CASH". Convert before sending.
        notes: data.note || undefined,
        // WHY: Frontend field is 'note', backend field is 'notes'. Rename here.
        // || undefined omits the field if note is an empty string.
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
      // WHY: For customers, the frontend form fields match the backend fields exactly,
      // so we can pass data directly with JSON.stringify without renaming anything.
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
// WHY: dashboardApi groups all calls needed to populate the main dashboard screen.
// Having them together makes it easy to see which endpoints power the dashboard.

export const dashboardApi = {
  async getKPIs(): Promise<DashboardKPIs> {
    // WHY: Fetch today's key numbers — revenue, orders, customers, average order value.
    const raw = await apiFetch<any>('/reports/kpis');
    return {
      // WHY: Every field uses Number(...) to ensure Decimal → number conversion, and
      // ?? 0 to provide a safe default in case the backend omits a field.
      todayRevenue: Number(raw.todayRevenue ?? 0),
      todayOrders: raw.todayOrders ?? 0,
      todayCustomers: raw.todayCustomers ?? 0,
      todayAvgOrder: Number(raw.todayAvgOrder ?? 0),
      revenueChange: Number(raw.revenueChange ?? 0),
      // WHY: "Change" fields are percentage deltas vs. yesterday. Defaulting to 0 means
      // "no change" when data is missing, which is better than showing NaN or crashing.
      ordersChange: Number(raw.ordersChange ?? 0),
      customersChange: Number(raw.customersChange ?? 0),
      avgOrderChange: Number(raw.avgOrderChange ?? 0),
    };
  },

  async getDailySales(): Promise<DailySales[]> {
    // WHY: Fetch the revenue/orders/customers breakdown for each day (for charts).
    const raw = await apiFetch<any[]>('/reports/daily-sales');
    // WHY: raw ?? [] is a safety net — if the endpoint returns null, we use an empty
    // array so .map() below doesn't crash (can't call .map() on null).
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
      // WHY: r.category ?? r.name handles a case where different backend versions might
      // return the category label under different field names. We try 'category' first,
      // then fall back to 'name', then to empty string.
      category: r.category ?? r.name ?? '',
      revenue: Number(r.revenue ?? 0),
      units: r.units ?? r.quantity ?? 0,
      // WHY: Same multi-fallback pattern — try 'units', then 'quantity', then 0.
    }));
  },

  async getTopProducts(): Promise<TopProduct[]> {
    const raw = await apiFetch<any[]>('/reports/top-products');
    return (raw ?? []).map((r) => ({
      productId: r.productId,
      productName: r.productName ?? r.name ?? '',
      // WHY: Backend might return the name as 'productName' or just 'name'. We handle both.
      revenue: Number(r.revenue ?? 0),
      units: r.units ?? r.quantity ?? 0,
    }));
  },

  async getRecentOrders(): Promise<Order[]> {
    // WHY: We reuse ordersApi.getAll() with pageSize: 5 to get the 5 most recent orders.
    // This avoids duplicating the order-fetching logic — DRY principle (Don't Repeat Yourself).
    const res = await ordersApi.getAll({ pageSize: 5 });
    // WHY: We only want the array of orders, not the pagination metadata.
    return res.data;
  },
};

// ─── Reports ───────────────────────────────────────────────────────────────
// WHY: reportsApi is used by the Reports page which needs more control (e.g., date ranges)
// than the dashboard. Some methods simply delegate to dashboardApi to avoid duplication.

export const reportsApi = {
  async getDailySales(range?: { from: string; to: string }): Promise<DailySales[]> {
    // WHY: range? makes the date range optional. If provided, we add from/to query params.
    const q = range ? buildQuery({ from: range.from, to: range.to }) : '';
    // WHY: If range is undefined, q is empty string '' — the URL has no query params.
    const raw = await apiFetch<any[]>(`/reports/daily-sales${q}`);
    return (raw ?? []).map((r) => ({
      date: r.date,
      revenue: Number(r.revenue ?? 0),
      orders: r.orders ?? 0,
      customers: r.customers ?? 0,
    }));
  },

  async getSalesByCategory(): Promise<SalesByCategory[]> {
    // WHY: Delegate to dashboardApi — the same endpoint and mapping logic, no reason to duplicate.
    return dashboardApi.getSalesByCategory();
  },

  async getTopProducts(): Promise<TopProduct[]> {
    // WHY: Same delegation — reuse rather than repeat.
    return dashboardApi.getTopProducts();
  },
};

// ─── Inventory ─────────────────────────────────────────────────────────────

export const inventoryApi = {
  async getLowStockProducts(): Promise<Product[]> {
    const raw = await apiFetch<any[]>('/inventory/low-stock');
    return (raw ?? []).map((item) => mapProduct(item.product ?? item));
    // WHY: item.product ?? item handles two possible backend response shapes:
    // Some backends return { product: {...}, quantity: X }; others return the product directly.
    // ?? item means: if item.product is null/undefined, use item itself.
  },

  async getStockMovements(): Promise<StockMovement[]> {
    const raw = await apiFetch<any[]>('/inventory/movements');
    return (raw ?? []).map(mapStockMovement);
    // WHY: .map(mapStockMovement) is shorthand for .map(m => mapStockMovement(m)).
    // When the callback just calls one function with each element, you can pass the function directly.
  },

  async adjustStock(productId: string, qty: number, reason: string): Promise<Product> {
    const raw = await apiFetch<any>(`/inventory/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({
        quantity: qty,
        reason,
        // WHY: The backend needs to know if this is stock coming IN or going OUT.
        // qty > 0 means we're adding stock (IN), negative means removing stock (OUT).
        // This ternary automatically determines the direction from the sign of the number.
        type: qty > 0 ? 'IN' : 'OUT',
      }),
    });
    return mapProduct(raw.product ?? raw);
    // WHY: Some endpoints wrap the product in { product: {...} }; others return it directly.
    // raw.product ?? raw handles both shapes safely.
  },
};

// ─── Users ─────────────────────────────────────────────────────────────────
// WHY: usersApi manages employee accounts. These endpoints require ADMIN or MANAGER roles
// (enforced by the backend — a cashier calling these would get a 403 Forbidden error).

export const usersApi = {
  async getAll(): Promise<User[]> {
    const raw = await apiFetch<any[]>('/users');
    // WHY: raw ?? [] guards against null response; .map(mapUser) transforms each user.
    return (raw ?? []).map(mapUser);
  },

  async create(data: { name: string; email: string; password: string; role: string }): Promise<User> {
    // WHY: We define the data shape inline with a TypeScript object type because this
    // specific shape is only used here — no need for a named type.
    const raw = await apiFetch<any>('/users', { method: 'POST', body: JSON.stringify(data) });
    return mapUser(raw);
  },

  async update(id: string, data: { name?: string; email?: string; role?: string; password?: string }): Promise<User> {
    // WHY: All fields are optional (?) because you might only update the role, or only the name.
    const raw = await apiFetch<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return mapUser(raw);
  },

  async toggleActive(id: string): Promise<{ id: string; active: boolean }> {
    // WHY: This endpoint flips a user's active status (enabled ↔ disabled).
    // It returns a simple object with just the id and new active status — no need for mapUser.
    return apiFetch<any>(`/users/${id}/toggle`, { method: 'PATCH' });
  },

  async getMe(): Promise<User> {
    // WHY: Fetches the currently logged-in user's own profile.
    // The backend determines "me" from the JWT token, so no ID is needed in the URL.
    const raw = await apiFetch<any>('/auth/me');
    return mapUser(raw);
  },

  async updateMe(data: { name?: string; email?: string }): Promise<User> {
    // WHY: Lets the logged-in user update their own name/email.
    const raw = await apiFetch<any>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
    return mapUser(raw);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // WHY: Password change requires the current password for security verification,
    // so the user can't change their password if someone else has their session.
    await apiFetch<any>('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    // WHY: Promise<void> — we don't need any data back, just confirmation it worked.
  },
};

// ─── Stores ────────────────────────────────────────────────────────────────
// WHY: storesApi manages the store's own settings (name, contact info, tax rate, etc.).

export const storesApi = {
  async getById(id: string) {
    // WHY: No explicit return type annotation here — TypeScript infers it from apiFetch's return.
    // This is fine for less critical data where we don't need strict type safety.
    return apiFetch<any>(`/stores/${id}`);
  },

  async update(id: string, data: {
    // WHY: All fields are optional — you can update just the phone number without touching other fields.
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    currency?: string;
    timezone?: string;
    taxRate?: number;
  }) {
    return apiFetch<any>(`/stores/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
};

// ─── AI ────────────────────────────────────────────────────────────────────
// WHY: aiApi wraps the backend's AI endpoints — chat, product recommendations, sales prediction.

export const aiApi = {
  async chat(message: string): Promise<string> {
    // WHY: The chat endpoint returns a single string reply from the AI.
    // Promise<string> says "this async function eventually resolves to a string".
    const raw = await apiFetch<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
      // WHY: { message } is shorthand for { message: message } — ES6 shorthand property syntax.
    });
    return raw?.reply ?? raw?.message ?? raw?.response ?? String(raw);
    // WHY: The AI backend might return the reply text under different field names depending
    // on which AI provider or version is running. We try 'reply', then 'message', then
    // 'response'. The final fallback String(raw) converts whatever we got to a string.
    // ?. (optional chaining) before each property prevents crashes if raw is null.
  },

  async getRecommendations() {
    // WHY: Returns AI-generated product recommendations (e.g., "restock these items").
    return apiFetch<any[]>('/ai/recommendations');
  },

  async getSalesPrediction() {
    // WHY: Returns AI-generated revenue forecast data for future days.
    return apiFetch<any[]>('/ai/sales-prediction');
  },
};
