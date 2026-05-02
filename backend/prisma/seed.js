"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const store = await prisma.store.upsert({
        where: { id: 'store-default' },
        update: {},
        create: {
            id: 'store-default',
            name: 'POS Enterprise - Main Store',
            address: '123 Main Street, Mumbai, India',
            phone: '+91 98765 43210',
            email: 'store@posapp.com',
            taxRate: 18,
            currency: 'INR',
            timezone: 'Asia/Kolkata',
        },
    });
    console.log(`✓ Store: ${store.name}`);
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
        where: { storeId_email: { storeId: store.id, email: 'admin@posapp.com' } },
        update: {},
        create: {
            storeId: store.id,
            email: 'admin@posapp.com',
            password: adminPassword,
            name: 'Admin User',
            role: client_1.Role.ADMIN,
        },
    });
    console.log(`✓ Admin: ${admin.email} / Admin@123`);
    const managerPassword = await bcrypt.hash('Manager@123', 10);
    const manager = await prisma.user.upsert({
        where: { storeId_email: { storeId: store.id, email: 'manager@posapp.com' } },
        update: {},
        create: {
            storeId: store.id,
            email: 'manager@posapp.com',
            password: managerPassword,
            name: 'Store Manager',
            role: client_1.Role.MANAGER,
        },
    });
    console.log(`✓ Manager: ${manager.email} / Manager@123`);
    const cashierPassword = await bcrypt.hash('Cashier@123', 10);
    const cashier = await prisma.user.upsert({
        where: { storeId_email: { storeId: store.id, email: 'cashier@posapp.com' } },
        update: {},
        create: {
            storeId: store.id,
            email: 'cashier@posapp.com',
            password: cashierPassword,
            name: 'Cashier One',
            role: client_1.Role.CASHIER,
        },
    });
    console.log(`✓ Cashier: ${cashier.email} / Cashier@123`);
    const cats = [
        { name: 'Electronics', color: '#6366f1', icon: '💻' },
        { name: 'Food & Beverage', color: '#f59e0b', icon: '🍔' },
        { name: 'Clothing', color: '#ec4899', icon: '👕' },
        { name: 'Health & Beauty', color: '#10b981', icon: '💊' },
        { name: 'Sports', color: '#3b82f6', icon: '⚽' },
        { name: 'Home & Garden', color: '#8b5cf6', icon: '🏡' },
        { name: 'Books', color: '#f97316', icon: '📚' },
        { name: 'Toys', color: '#ef4444', icon: '🧸' },
    ];
    const categories = [];
    for (const cat of cats) {
        const c = await prisma.category.upsert({
            where: { storeId_name: { storeId: store.id, name: cat.name } },
            update: {},
            create: { storeId: store.id, ...cat },
        });
        categories.push(c);
    }
    console.log(`✓ ${categories.length} categories`);
    const products = [
        { name: 'Wireless Headphones Pro', sku: 'ELEC-001', barcode: '8901234567890', price: 2499, cost: 1200, categoryIdx: 0, stock: 25, minStock: 5 },
        { name: 'Smart Watch Series X', sku: 'ELEC-002', barcode: '8901234567891', price: 8999, cost: 4500, categoryIdx: 0, stock: 15, minStock: 3 },
        { name: 'USB-C Fast Charger 65W', sku: 'ELEC-003', barcode: '8901234567892', price: 999, cost: 400, categoryIdx: 0, stock: 50, minStock: 10 },
        { name: 'Premium Coffee Blend 500g', sku: 'FOOD-001', barcode: '8901234567893', price: 450, cost: 200, categoryIdx: 1, stock: 30, minStock: 8 },
        { name: 'Energy Drink 250ml', sku: 'FOOD-002', barcode: '8901234567894', price: 120, cost: 60, categoryIdx: 1, stock: 100, minStock: 20 },
        { name: 'Organic Green Tea', sku: 'FOOD-003', barcode: '8901234567895', price: 280, cost: 120, categoryIdx: 1, stock: 3, minStock: 5 },
        { name: 'Classic Polo T-Shirt', sku: 'CLTH-001', barcode: '8901234567896', price: 699, cost: 280, categoryIdx: 2, stock: 45, minStock: 10 },
        { name: 'Denim Jacket', sku: 'CLTH-002', barcode: '8901234567897', price: 2299, cost: 1000, categoryIdx: 2, stock: 12, minStock: 3 },
        { name: 'Vitamin C 1000mg (60 tabs)', sku: 'HLTH-001', barcode: '8901234567898', price: 399, cost: 150, categoryIdx: 3, stock: 40, minStock: 10 },
        { name: 'Protein Powder Whey 1kg', sku: 'SPRT-001', barcode: '8901234567899', price: 1899, cost: 900, categoryIdx: 4, stock: 2, minStock: 5 },
        { name: 'Yoga Mat Premium', sku: 'SPRT-002', barcode: '8901234567900', price: 899, cost: 350, categoryIdx: 4, stock: 20, minStock: 4 },
        { name: 'Smart LED Bulb 9W', sku: 'HOME-001', barcode: '8901234567901', price: 349, cost: 150, categoryIdx: 5, stock: 60, minStock: 15 },
    ];
    for (const p of products) {
        const existing = await prisma.product.findUnique({
            where: { storeId_sku: { storeId: store.id, sku: p.sku } },
        });
        if (!existing) {
            const product = await prisma.product.create({
                data: {
                    storeId: store.id,
                    categoryId: categories[p.categoryIdx].id,
                    name: p.name,
                    sku: p.sku,
                    barcode: p.barcode,
                    price: p.price,
                    cost: p.cost,
                    imageUrl: `https://images.unsplash.com/photo-${1550000000000 + Math.floor(Math.random() * 100000000)}?w=400&h=300&fit=crop`,
                },
            });
            await prisma.inventory.create({
                data: {
                    storeId: store.id,
                    productId: product.id,
                    quantity: p.stock,
                    minStock: p.minStock,
                },
            });
        }
    }
    console.log(`✓ ${products.length} products with inventory`);
    const customers = [
        { name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765 00001', loyaltyPoints: 1250, totalSpent: 12500, totalOrders: 8 },
        { name: 'Rahul Gupta', email: 'rahul@example.com', phone: '+91 98765 00002', loyaltyPoints: 800, totalSpent: 8000, totalOrders: 5 },
        { name: 'Anita Singh', email: 'anita@example.com', phone: '+91 98765 00003', loyaltyPoints: 350, totalSpent: 3500, totalOrders: 3 },
        { name: 'Vikram Patel', email: 'vikram@example.com', phone: '+91 98765 00004', loyaltyPoints: 2100, totalSpent: 21000, totalOrders: 14 },
        { name: 'Sunita Joshi', email: 'sunita@example.com', phone: '+91 98765 00005', loyaltyPoints: 600, totalSpent: 6000, totalOrders: 4 },
        { name: 'Walk-in Customer', email: null, phone: null, loyaltyPoints: 0, totalSpent: 0, totalOrders: 0 },
    ];
    for (const c of customers) {
        if (c.email) {
            await prisma.customer.upsert({
                where: { storeId_email: { storeId: store.id, email: c.email } },
                update: {},
                create: { storeId: store.id, ...c },
            });
        }
        else {
            const existing = await prisma.customer.findFirst({ where: { storeId: store.id, name: c.name } });
            if (!existing) {
                await prisma.customer.create({ data: { storeId: store.id, ...c } });
            }
        }
    }
    console.log(`✓ ${customers.length} customers`);
    console.log('\n🎉 Seed complete!');
    console.log('─────────────────────────────');
    console.log('Login credentials:');
    console.log('  Admin:   admin@posapp.com   / Admin@123');
    console.log('  Manager: manager@posapp.com / Manager@123');
    console.log('  Cashier: cashier@posapp.com / Cashier@123');
    console.log('  Store ID: store-default');
    console.log('─────────────────────────────');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed.js.map