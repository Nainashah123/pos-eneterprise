import type {
  Product,
  Order,
  Customer,
  User,
  DailySales,
  SalesByCategory,
  TopProduct,
  StockMovement,
  DashboardKPIs,
} from '@/types';

// ─── Products ──────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Espresso Shot', sku: 'BEV-001', category: 'beverages', price: 120, cost: 40, stock: 999, minStock: 10, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=200&q=80', description: 'Rich double espresso', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p2', name: 'Cappuccino', sku: 'BEV-002', category: 'beverages', price: 180, cost: 55, stock: 999, minStock: 10, image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=200&q=80', description: 'Creamy cappuccino with foam', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p3', name: 'Cold Brew', sku: 'BEV-003', category: 'beverages', price: 220, cost: 65, stock: 48, minStock: 10, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&q=80', description: '18-hour cold brewed coffee', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p4', name: 'Green Tea', sku: 'BEV-004', category: 'beverages', price: 150, cost: 30, stock: 200, minStock: 20, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&q=80', description: 'Premium Japanese green tea', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p5', name: 'Club Sandwich', sku: 'FOOD-001', category: 'food', price: 280, cost: 120, stock: 50, minStock: 5, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&q=80', description: 'Triple-decker club sandwich', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p6', name: 'Caesar Salad', sku: 'FOOD-002', category: 'food', price: 240, cost: 90, stock: 30, minStock: 5, image: 'https://images.unsplash.com/photo-1512852939750-1305098529bf?w=200&q=80', description: 'Classic caesar with croutons', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p7', name: 'Chocolate Cake', sku: 'FOOD-003', category: 'food', price: 320, cost: 140, stock: 20, minStock: 5, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&q=80', description: 'Rich dark chocolate cake slice', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p8', name: 'Wireless Earbuds', sku: 'ELEC-001', category: 'electronics', price: 2999, cost: 1800, stock: 8, minStock: 5, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&q=80', description: 'True wireless earbuds with ANC', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p9', name: 'Phone Stand', sku: 'ELEC-002', category: 'electronics', price: 499, cost: 200, stock: 3, minStock: 5, image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&q=80', description: 'Adjustable aluminum phone stand', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p10', name: 'Cotton T-Shirt', sku: 'CLO-001', category: 'clothing', price: 599, cost: 220, stock: 45, minStock: 10, image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=200&q=80', description: 'Premium cotton unisex tee', taxable: false, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p11', name: 'Denim Jeans', sku: 'CLO-002', category: 'clothing', price: 1299, cost: 600, stock: 22, minStock: 8, image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&q=80', description: 'Slim-fit stretch denim', taxable: false, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p12', name: 'Leather Wallet', sku: 'ACC-001', category: 'accessories', price: 799, cost: 300, stock: 15, minStock: 5, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200&q=80', description: 'Slim genuine leather bifold', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p13', name: 'Sunglasses', sku: 'ACC-002', category: 'accessories', price: 1499, cost: 500, stock: 12, minStock: 5, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&q=80', description: 'UV400 polarized sunglasses', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p14', name: 'Face Moisturizer', sku: 'BEA-001', category: 'beauty', price: 899, cost: 350, stock: 28, minStock: 8, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&q=80', description: 'SPF 30 daily moisturizer', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p15', name: 'Yoga Mat', sku: 'SPO-001', category: 'sports', price: 999, cost: 400, stock: 4, minStock: 5, image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=200&q=80', description: 'Non-slip 6mm exercise mat', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: 'p16', name: 'Scented Candle', sku: 'HOM-001', category: 'home', price: 649, cost: 220, stock: 35, minStock: 8, image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=200&q=80', description: 'Lavender soy wax candle 200g', taxable: true, active: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
];

// ─── Customers ─────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Arjun Sharma', email: 'arjun@example.com', phone: '+91 98765 43210', address: '12, MG Road, Bengaluru', loyaltyPoints: 1240, totalSpent: 24800, totalOrders: 31, tags: ['VIP', 'Regular'], createdAt: '2024-01-15T00:00:00Z' },
  { id: 'c2', name: 'Priya Patel', email: 'priya@example.com', phone: '+91 87654 32109', address: '45, Park Street, Mumbai', loyaltyPoints: 850, totalSpent: 17000, totalOrders: 22, tags: ['Regular'], createdAt: '2024-02-10T00:00:00Z' },
  { id: 'c3', name: 'Ravi Kumar', email: 'ravi@example.com', phone: '+91 76543 21098', address: '8, Anna Nagar, Chennai', loyaltyPoints: 2100, totalSpent: 42000, totalOrders: 48, tags: ['VIP', 'Premium'], createdAt: '2023-11-05T00:00:00Z' },
  { id: 'c4', name: 'Sneha Joshi', email: 'sneha@example.com', phone: '+91 65432 10987', address: '22, Laxmi Nagar, Delhi', loyaltyPoints: 420, totalSpent: 8400, totalOrders: 12, tags: [], createdAt: '2024-03-20T00:00:00Z' },
  { id: 'c5', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 54321 09876', address: '7, Civil Lines, Jaipur', loyaltyPoints: 3200, totalSpent: 64000, totalOrders: 72, tags: ['VIP', 'Premium', 'Regular'], createdAt: '2023-08-12T00:00:00Z' },
  { id: 'c6', name: 'Deepa Nair', email: 'deepa@example.com', phone: '+91 43210 98765', address: '34, Jubilee Hills, Hyderabad', loyaltyPoints: 680, totalSpent: 13600, totalOrders: 18, tags: ['Regular'], createdAt: '2024-01-28T00:00:00Z' },
];

// ─── Orders ────────────────────────────────────────────────────────────────

export const MOCK_ORDERS: Order[] = [
  { id: 'o1', orderNumber: 'ORD-A1B2C3', customerId: 'c1', customerName: 'Arjun Sharma', items: [{ productId: 'p1', productName: 'Espresso Shot', sku: 'BEV-001', quantity: 2, unitPrice: 120, discount: 0, total: 240 }, { productId: 'p5', productName: 'Club Sandwich', sku: 'FOOD-001', quantity: 1, unitPrice: 280, discount: 10, total: 252 }], subtotal: 492, discount: 10, tax: 44.28, total: 536.28, paymentMethod: 'card', status: 'completed', cashierName: 'Admin User', note: '', createdAt: '2024-06-10T09:23:00Z' },
  { id: 'o2', orderNumber: 'ORD-D4E5F6', customerId: 'c2', customerName: 'Priya Patel', items: [{ productId: 'p2', productName: 'Cappuccino', sku: 'BEV-002', quantity: 1, unitPrice: 180, discount: 0, total: 180 }, { productId: 'p7', productName: 'Chocolate Cake', sku: 'FOOD-003', quantity: 1, unitPrice: 320, discount: 0, total: 320 }], subtotal: 500, discount: 0, tax: 45, total: 545, paymentMethod: 'upi', status: 'completed', cashierName: 'Admin User', note: 'Birthday order', createdAt: '2024-06-10T10:45:00Z' },
  { id: 'o3', orderNumber: 'ORD-G7H8I9', customerId: null, customerName: null, items: [{ productId: 'p8', productName: 'Wireless Earbuds', sku: 'ELEC-001', quantity: 1, unitPrice: 2999, discount: 5, total: 2849.05 }], subtotal: 2999, discount: 5, tax: 269.91, total: 3118.96, paymentMethod: 'cash', status: 'completed', cashierName: 'Admin User', note: '', createdAt: '2024-06-10T11:30:00Z' },
  { id: 'o4', orderNumber: 'ORD-J1K2L3', customerId: 'c3', customerName: 'Ravi Kumar', items: [{ productId: 'p10', productName: 'Cotton T-Shirt', sku: 'CLO-001', quantity: 3, unitPrice: 599, discount: 10, total: 1617.3 }, { productId: 'p12', productName: 'Leather Wallet', sku: 'ACC-001', quantity: 1, unitPrice: 799, discount: 0, total: 799 }], subtotal: 2596, discount: 8, tax: 214.67, total: 2503.67, paymentMethod: 'card', status: 'completed', cashierName: 'Admin User', note: '', createdAt: '2024-06-10T13:15:00Z' },
  { id: 'o5', orderNumber: 'ORD-M4N5O6', customerId: 'c4', customerName: 'Sneha Joshi', items: [{ productId: 'p14', productName: 'Face Moisturizer', sku: 'BEA-001', quantity: 2, unitPrice: 899, discount: 0, total: 1798 }], subtotal: 1798, discount: 0, tax: 161.82, total: 1959.82, paymentMethod: 'upi', status: 'pending', cashierName: 'Admin User', note: '', createdAt: '2024-06-10T14:20:00Z' },
  { id: 'o6', orderNumber: 'ORD-P7Q8R9', customerId: 'c5', customerName: 'Vikram Singh', items: [{ productId: 'p13', productName: 'Sunglasses', sku: 'ACC-002', quantity: 1, unitPrice: 1499, discount: 15, total: 1274.15 }], subtotal: 1499, discount: 15, tax: 114.67, total: 1298.82, paymentMethod: 'card', status: 'refunded', cashierName: 'Admin User', note: 'Customer dissatisfied', createdAt: '2024-06-09T16:00:00Z' },
  { id: 'o7', orderNumber: 'ORD-S1T2U3', customerId: 'c6', customerName: 'Deepa Nair', items: [{ productId: 'p4', productName: 'Green Tea', sku: 'BEV-004', quantity: 2, unitPrice: 150, discount: 0, total: 300 }, { productId: 'p6', productName: 'Caesar Salad', sku: 'FOOD-002', quantity: 1, unitPrice: 240, discount: 0, total: 240 }], subtotal: 540, discount: 0, tax: 48.6, total: 588.6, paymentMethod: 'cash', status: 'completed', cashierName: 'Admin User', note: '', createdAt: '2024-06-09T12:10:00Z' },
  { id: 'o8', orderNumber: 'ORD-V4W5X6', customerId: 'c1', customerName: 'Arjun Sharma', items: [{ productId: 'p15', productName: 'Yoga Mat', sku: 'SPO-001', quantity: 1, unitPrice: 999, discount: 0, total: 999 }, { productId: 'p16', productName: 'Scented Candle', sku: 'HOM-001', quantity: 2, unitPrice: 649, discount: 0, total: 1298 }], subtotal: 2297, discount: 0, tax: 206.73, total: 2503.73, paymentMethod: 'upi', status: 'completed', cashierName: 'Admin User', note: '', createdAt: '2024-06-08T15:45:00Z' },
];

// ─── Users ─────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@posapp.com', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', active: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'u2', name: 'Sarah Manager', email: 'sarah@posapp.com', role: 'manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', active: true, createdAt: '2023-03-15T00:00:00Z' },
  { id: 'u3', name: 'Tom Cashier', email: 'tom@posapp.com', role: 'cashier', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom', active: true, createdAt: '2023-06-01T00:00:00Z' },
  { id: 'u4', name: 'Lisa Cashier', email: 'lisa@posapp.com', role: 'cashier', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa', active: false, createdAt: '2023-09-01T00:00:00Z' },
];

// ─── Dashboard KPIs ────────────────────────────────────────────────────────

export const MOCK_KPIS: DashboardKPIs = {
  todayRevenue: 48290,
  todayOrders: 124,
  todayCustomers: 89,
  todayAvgOrder: 389.44,
  revenueChange: 12.4,
  ordersChange: 8.2,
  customersChange: 5.7,
  avgOrderChange: 3.9,
};

// ─── Sales Chart Data ───────────────────────────────────────────────────────

export const MOCK_DAILY_SALES: DailySales[] = [
  { date: '2024-05-25', revenue: 38200, orders: 98, customers: 72 },
  { date: '2024-05-26', revenue: 41500, orders: 105, customers: 81 },
  { date: '2024-05-27', revenue: 35800, orders: 92, customers: 68 },
  { date: '2024-05-28', revenue: 52300, orders: 134, customers: 99 },
  { date: '2024-05-29', revenue: 47900, orders: 122, customers: 90 },
  { date: '2024-05-30', revenue: 44100, orders: 112, customers: 84 },
  { date: '2024-05-31', revenue: 39600, orders: 101, customers: 75 },
  { date: '2024-06-01', revenue: 43800, orders: 110, customers: 82 },
  { date: '2024-06-02', revenue: 56700, orders: 145, customers: 108 },
  { date: '2024-06-03', revenue: 61200, orders: 158, customers: 118 },
  { date: '2024-06-04', revenue: 48900, orders: 125, customers: 93 },
  { date: '2024-06-05', revenue: 45200, orders: 116, customers: 87 },
  { date: '2024-06-06', revenue: 42100, orders: 107, customers: 80 },
  { date: '2024-06-07', revenue: 38700, orders: 99, customers: 74 },
  { date: '2024-06-08', revenue: 51300, orders: 131, customers: 97 },
  { date: '2024-06-09', revenue: 46800, orders: 119, customers: 89 },
  { date: '2024-06-10', revenue: 48290, orders: 124, customers: 89 },
];

export const MOCK_SALES_BY_CATEGORY: SalesByCategory[] = [
  { category: 'Beverages', revenue: 18400, units: 342 },
  { category: 'Food', revenue: 14200, units: 186 },
  { category: 'Electronics', revenue: 28900, units: 48 },
  { category: 'Clothing', revenue: 12600, units: 94 },
  { category: 'Accessories', revenue: 9800, units: 72 },
  { category: 'Beauty', revenue: 7400, units: 55 },
  { category: 'Sports', revenue: 5200, units: 38 },
  { category: 'Home', revenue: 4100, units: 43 },
];

export const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { productId: 'p8', productName: 'Wireless Earbuds', revenue: 28900, units: 48 },
  { productId: 'p2', productName: 'Cappuccino', revenue: 12600, units: 280 },
  { productId: 'p11', productName: 'Denim Jeans', revenue: 9100, units: 42 },
  { productId: 'p1', productName: 'Espresso Shot', revenue: 8400, units: 420 },
  { productId: 'p13', productName: 'Sunglasses', revenue: 7200, units: 28 },
];

// ─── Stock Movements ────────────────────────────────────────────────────────

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'sm1', productId: 'p9', productName: 'Phone Stand', type: 'out', quantity: 2, reason: 'POS Sale', createdAt: '2024-06-10T11:30:00Z' },
  { id: 'sm2', productId: 'p15', productName: 'Yoga Mat', type: 'out', quantity: 1, reason: 'POS Sale', createdAt: '2024-06-10T10:00:00Z' },
  { id: 'sm3', productId: 'p8', productName: 'Wireless Earbuds', type: 'in', quantity: 20, reason: 'Stock Replenishment', createdAt: '2024-06-09T09:00:00Z' },
  { id: 'sm4', productId: 'p3', productName: 'Cold Brew', type: 'in', quantity: 48, reason: 'Stock Replenishment', createdAt: '2024-06-09T08:30:00Z' },
  { id: 'sm5', productId: 'p9', productName: 'Phone Stand', type: 'adjustment', quantity: -2, reason: 'Inventory Correction', createdAt: '2024-06-08T17:00:00Z' },
];

// ─── AI Insights ────────────────────────────────────────────────────────────

export const AI_INSIGHTS = [
  { id: 1, icon: '📈', title: 'Revenue Spike Expected', body: 'Based on last 30 days, expect 18% higher revenue this Saturday. Consider stocking up on Cappuccino and Espresso.', priority: 'high' as const },
  { id: 2, icon: '⚠️', title: 'Low Stock Alert', body: 'Phone Stand (3 units) and Yoga Mat (4 units) are below minimum stock levels. Reorder recommended.', priority: 'high' as const },
  { id: 3, icon: '💡', title: 'Bundle Opportunity', body: 'Customers who buy Cappuccino also buy Chocolate Cake 68% of the time. Create a bundle for ₹450 (save ₹50).', priority: 'medium' as const },
  { id: 4, icon: '🎯', title: 'Customer Win-Back', body: '3 VIP customers haven\'t purchased in 30+ days. Send a 15% loyalty discount to re-engage them.', priority: 'medium' as const },
];

// ─── AI Prediction Chart ────────────────────────────────────────────────────

export const AI_PREDICTION_DATA = [
  { date: '2024-06-11', actual: null, predicted: 51200 },
  { date: '2024-06-12', actual: null, predicted: 53800 },
  { date: '2024-06-13', actual: null, predicted: 49100 },
  { date: '2024-06-14', actual: null, predicted: 65400 },
  { date: '2024-06-15', actual: null, predicted: 72100 },
  { date: '2024-06-16', actual: null, predicted: 68300 },
  { date: '2024-06-17', actual: null, predicted: 54900 },
];
