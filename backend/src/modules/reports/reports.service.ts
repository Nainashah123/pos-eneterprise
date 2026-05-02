import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class ReportsService {
  private readonly CACHE_TTL = 300; // 5 min

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboardKpis(storeId: string) {
    const cacheKey = `reports:kpis:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayOrders, yesterdayOrders, totalProducts, totalCustomers] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId, status: 'COMPLETED', createdAt: { gte: todayStart } },
        select: { total: true, customerId: true },
      }),
      this.prisma.order.findMany({
        where: { storeId, status: 'COMPLETED', createdAt: { gte: yesterdayStart, lt: todayStart } },
        select: { total: true, customerId: true },
      }),
      this.prisma.product.count({ where: { storeId, active: true } }),
      this.prisma.customer.count({ where: { storeId, active: true } }),
    ]);

    const calc = (orders: { total: number; customerId: string | null }[]) => ({
      revenue: orders.reduce((s, o) => s + o.total, 0),
      orders: orders.length,
      customers: new Set(orders.filter(o => o.customerId).map(o => o.customerId!)).size,
      avgOrder: orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
    });

    const today = calc(todayOrders);
    const yesterday = calc(yesterdayOrders);
    const pct = (a: number, b: number) => b === 0 ? 0 : +((((a - b) / b) * 100).toFixed(1));

    const result = {
      todayRevenue: +today.revenue.toFixed(2),
      todayOrders: today.orders,
      todayCustomers: today.customers,
      todayAvgOrder: +today.avgOrder.toFixed(2),
      revenueChange: pct(today.revenue, yesterday.revenue),
      ordersChange: pct(today.orders, yesterday.orders),
      customersChange: pct(today.customers, yesterday.customers),
      avgOrderChange: pct(today.avgOrder, yesterday.avgOrder),
      totalProducts,
      totalCustomers,
    };

    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getDailySales(storeId: string, dto: DateRangeDto) {
    const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 86400000);
    const to = dto.to ? new Date(dto.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const cacheKey = `reports:daily:${storeId}:${from.toISOString().split('T')[0]}:${to.toISOString().split('T')[0]}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const date = o.createdAt.toISOString().split('T')[0];
      if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, orders: 0 });
      dayMap.get(date)!.revenue += o.total;
      dayMap.get(date)!.orders += 1;
    }

    const result = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, revenue: +v.revenue.toFixed(2), orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getMonthlyRevenue(storeId: string) {
    const cacheKey = `reports:monthly:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: twelveMonthsAgo } },
      select: { total: true, createdAt: true },
    });

    const monthMap = new Map<string, number>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthMap.set(key, (monthMap.get(key) || 0) + o.total);
    }

    const result = Array.from(monthMap.entries())
      .map(([month, revenue]) => ({ month, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getTopProducts(storeId: string, limit = 10) {
    const cacheKey = `reports:top-products:${storeId}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const items = await this.prisma.orderItem.findMany({
      where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } },
      select: { productId: true, productName: true, quantity: true, total: true },
    });

    const map = new Map<string, { name: string; revenue: number; units: number }>();
    for (const item of items) {
      if (!map.has(item.productId)) map.set(item.productId, { name: item.productName, revenue: 0, units: 0 });
      map.get(item.productId)!.revenue += item.total;
      map.get(item.productId)!.units += item.quantity;
    }

    const result = Array.from(map.entries())
      .map(([productId, v]) => ({ productId, productName: v.name, revenue: +v.revenue.toFixed(2), unitsSold: v.units }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getSalesByCategory(storeId: string) {
    const cacheKey = `reports:by-category:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const items = await this.prisma.orderItem.findMany({
      where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } },
      select: { total: true, quantity: true, product: { select: { category: { select: { name: true } } } } },
    });

    const map = new Map<string, { revenue: number; units: number }>();
    for (const item of items) {
      const cat = item.product?.category?.name || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, { revenue: 0, units: 0 });
      map.get(cat)!.revenue += item.total;
      map.get(cat)!.units += item.quantity;
    }

    const result = Array.from(map.entries())
      .map(([category, v]) => ({ category, revenue: +v.revenue.toFixed(2), units: v.units }))
      .sort((a, b) => b.revenue - a.revenue);

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
