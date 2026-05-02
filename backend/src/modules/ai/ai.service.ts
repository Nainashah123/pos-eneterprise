import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSalesPrediction(storeId: string) {
    const cacheKey = `ai:prediction:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, createdAt: true },
    });

    const dailyRevenue = new Map<string, number>();
    for (const o of orders) {
      const date = o.createdAt.toISOString().split('T')[0];
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + o.total);
    }

    const values = Array.from(dailyRevenue.values());
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 5000;
    const stddev = values.length > 1
      ? Math.sqrt(values.map(v => (v - avg) ** 2).reduce((s, v) => s + v, 0) / values.length)
      : avg * 0.1;

    const today = new Date();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i + 1);
      const dow = date.getDay();
      const multiplier = (dow === 0 || dow === 6) ? 1.15 : 1.0;
      const noise = (Math.random() - 0.5) * stddev * 0.3;
      const predicted = Math.max(0, (avg * multiplier + noise) * (1 + i * 0.005));
      return {
        date: date.toISOString().split('T')[0],
        predictedRevenue: +predicted.toFixed(2),
        confidence: +(0.90 - i * 0.04).toFixed(2),
      };
    });

    const result = {
      forecast,
      basedOnDays: values.length,
      avgDailyRevenue: +avg.toFixed(2),
      trend: values.length > 1 && values[values.length - 1] > values[0] ? 'upward' : 'stable',
    };

    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  async getRecommendations(storeId: string) {
    const cacheKey = `ai:recommendations:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [lowStockItems, recentItems, allProducts] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { storeId, product: { active: true } },
        include: { product: true },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } },
        select: { productId: true, productName: true, quantity: true, total: true },
      }),
      this.prisma.product.findMany({
        where: { storeId, active: true },
        select: { id: true, name: true, price: true, cost: true },
      }),
    ]);

    const recommendations: any[] = [];

    const critical = lowStockItems.filter(i => i.quantity <= i.minStock);
    for (const item of critical.slice(0, 3)) {
      recommendations.push({
        type: 'low_stock',
        priority: item.quantity === 0 ? 'high' : 'medium',
        title: `Restock ${item.product.name}`,
        body: `Only ${item.quantity} units left (minimum: ${item.minStock}).`,
        icon: '📦',
        productId: item.productId,
      });
    }

    const salesMap = new Map<string, { name: string; revenue: number; units: number }>();
    for (const item of recentItems) {
      if (!salesMap.has(item.productId)) salesMap.set(item.productId, { name: item.productName, revenue: 0, units: 0 });
      salesMap.get(item.productId)!.revenue += item.total;
      salesMap.get(item.productId)!.units += item.quantity;
    }
    const topSeller = Array.from(salesMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0];
    if (topSeller) {
      recommendations.push({
        type: 'promotion',
        priority: 'low',
        title: `Bundle ${topSeller[1].name}`,
        body: `Top performer (${topSeller[1].units} units sold). Create a bundle to drive more sales.`,
        icon: '🌟',
        productId: topSeller[0],
      });
    }

    const lowMargin = allProducts.filter(p => p.cost > 0 && (p.price - p.cost) / p.price < 0.25).slice(0, 2);
    for (const p of lowMargin) {
      const margin = (((p.price - p.cost) / p.price) * 100).toFixed(0);
      recommendations.push({
        type: 'margin',
        priority: 'medium',
        title: `Review pricing for ${p.name}`,
        body: `${p.name} has only ${margin}% gross margin. Consider raising price or reducing cost.`,
        icon: '💰',
        productId: p.id,
      });
    }

    await this.redis.set(cacheKey, recommendations, 3600);
    return recommendations;
  }

  async detectFraud(storeId: string) {
    const cacheKey = `ai:fraud:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const recentOrders = await this.prisma.order.findMany({
      where: { storeId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const flags: any[] = [];
    for (const order of recentOrders) {
      const reasons: string[] = [];
      let riskScore = 0;

      if (order.discountPct > 30) { reasons.push(`High discount: ${order.discountPct}%`); riskScore += 35; }
      if (order.total > 20000) { reasons.push(`High value: ₹${order.total.toFixed(0)}`); riskScore += 25; }
      const bulkItem = order.items.find(i => i.quantity > 10);
      if (bulkItem) { reasons.push(`Bulk qty: ${bulkItem.quantity}x ${bulkItem.productName}`); riskScore += 20; }
      if (order.paymentMethod === 'CASH' && order.total > 10000) {
        reasons.push(`Cash for high-value order`); riskScore += 20;
      }

      if (riskScore >= 20) {
        flags.push({ orderId: order.id, orderNumber: order.orderNumber, riskScore: Math.min(100, riskScore), reasons });
      }
    }

    const result = {
      flaggedOrders: flags.sort((a, b) => b.riskScore - a.riskScore),
      totalAnalyzed: recentOrders.length,
      flaggedCount: flags.length,
      analysisWindow: '7 days',
    };

    await this.redis.set(cacheKey, result, 1800);
    return result;
  }

  async chat(storeId: string, message: string) {
    const lower = message.toLowerCase();

    const recentOrders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { total: true },
    });

    const totalRevenue = recentOrders.reduce((s, o) => s + o.total, 0);
    const avgOrder = recentOrders.length ? totalRevenue / recentOrders.length : 0;

    let reply: string;

    if (lower.includes('best') && (lower.includes('sell') || lower.includes('product'))) {
      reply = 'Your top-performing products are available at GET /api/v1/reports/top-products. Filter by the last 30 days.';
    } else if (lower.includes('revenue') || lower.includes('increase') || lower.includes('improve')) {
      reply = `Your avg order value is ₹${avgOrder.toFixed(0)}. To grow: (1) bundle top sellers, (2) offer loyalty discounts, (3) run flash sales on slow movers.`;
    } else if (lower.includes('stock') || lower.includes('inventory')) {
      reply = 'Check GET /api/v1/inventory/low-stock for items that need restocking.';
    } else if (lower.includes('customer') || lower.includes('loyal')) {
      reply = 'Customers with high loyalty points but no recent orders are prime win-back candidates. Check GET /api/v1/customers.';
    } else if (lower.includes('fraud') || lower.includes('suspicious')) {
      reply = 'Use GET /api/v1/ai/fraud-detection for flagged orders with risk scores.';
    } else if (lower.includes('predict') || lower.includes('forecast')) {
      reply = 'GET /api/v1/ai/sales-prediction returns a 7-day revenue forecast with daily confidence scores.';
    } else {
      reply = `Processed ${recentOrders.length} orders totalling ₹${totalRevenue.toFixed(0)}. Ask me about sales, inventory, customers, or fraud detection.`;
    }

    return { reply, timestamp: new Date().toISOString() };
  }
}
