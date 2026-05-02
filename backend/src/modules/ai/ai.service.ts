// WHY: @Injectable() registers this service with NestJS so it can be injected
//   into the AI controller (or any other class that needs it).
import { Injectable } from '@nestjs/common';

// WHY: PrismaService is our database client — all queries to PostgreSQL go through it.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: RedisService caches AI results. AI computations are expensive (they scan
//   thousands of orders). Caching means repeated requests get instant responses.
import { RedisService } from '../../redis/redis.service';

// WHY: Important note about "AI" in this service:
//   This is NOT a neural network or a call to ChatGPT/OpenAI.
//   These features use STATISTICAL ANALYSIS and RULE-BASED LOGIC:
//   - Sales prediction = average + standard deviation + day-of-week multipliers
//   - Recommendations  = rules: stock < minStock → restock alert, margin < 25% → price alert
//   - Fraud detection  = scoring rules: discount > 30% = +35 risk points, etc.
//   - Chat             = keyword matching on the message text
//   This is a common pattern in small-business software. It works well and
//   needs no external AI API keys or paid services.

@Injectable()
export class AiService {

  // WHY: Both PrismaService and RedisService are injected automatically by NestJS.
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // WHY: getSalesPrediction forecasts revenue for the next 7 days using the last
  //   30 days of actual sales data. It uses statistical analysis (mean + stddev).
  async getSalesPrediction(storeId: string) {

    // WHY: Cache key scoped per store. Forecasts are cached for 1 hour (3600 seconds)
    //   since historical data doesn't change minute-to-minute.
    const cacheKey = `ai:prediction:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: `Date.now() - 30 * 86400000` = 30 days ago.
    //   86400000 = milliseconds in one day (24 * 60 * 60 * 1000).
    //   We look at the last 30 days to establish a "baseline" for predictions.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // WHY: Fetch all completed orders from the past 30 days.
    //   We only need `total` (for revenue per day) and `createdAt` (to group by day).
    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, createdAt: true },
    });

    // WHY: Group orders by date to get daily revenue totals.
    //   Same approach as reports.service: build a Map<dateString, totalRevenue>.
    const dailyRevenue = new Map<string, number>();
    for (const o of orders) {
      const date = o.createdAt.toISOString().split('T')[0];
      // WHY: Add this order's total to the running daily sum.
      //   `|| 0` handles the first order of a new day (no existing entry yet).
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + o.total);
    }

    // WHY: Extract just the array of daily revenue numbers for statistical calculations.
    const values = Array.from(dailyRevenue.values());

    // WHY: Calculate the MEAN (average) daily revenue.
    //   Formula: sum of all values / number of days.
    //   If no data exists yet (new store), default to 5000 as a placeholder.
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 5000;

    // WHY: Calculate the STANDARD DEVIATION — how much revenue varies day to day.
    //   Steps:
    //     1. For each day, compute (value - mean)^2   → how far it is from average, squared
    //     2. Average those squared differences          → "variance"
    //     3. Take the square root of the variance      → standard deviation
    //   High stddev = revenue is very unpredictable. Low stddev = very consistent.
    //   If we only have 1 day of data (can't compute real stddev), use 10% of avg as a guess.
    const stddev = values.length > 1
      ? Math.sqrt(values.map(v => (v - avg) ** 2).reduce((s, v) => s + v, 0) / values.length)
      : avg * 0.1;

    const today = new Date();

    // WHY: `Array.from({ length: 7 }, (_, i) => ...)` creates an array of 7 items.
    //   The `(_, i)` callback receives the index i (0=tomorrow, 1=day after, etc.).
    //   We generate a predicted revenue figure for each of the next 7 days.
    const forecast = Array.from({ length: 7 }, (_, i) => {

      // WHY: Calculate the actual calendar date for day i+1 (tomorrow, then +2, etc.)
      const date = new Date(today);
      date.setDate(date.getDate() + i + 1);

      // WHY: `getDay()` returns 0 = Sunday, 6 = Saturday.
      //   Weekends typically have higher sales in retail, so we apply a 15% multiplier.
      //   This is a domain-knowledge rule (not machine learning).
      const dow = date.getDay();
      const multiplier = (dow === 0 || dow === 6) ? 1.15 : 1.0;

      // WHY: Add random "noise" to make the forecast look realistic (not perfectly flat).
      //   `(Math.random() - 0.5)` = a random number between -0.5 and 0.5.
      //   Multiplying by stddev * 0.3 scales the noise relative to actual variability.
      //   This simulates the natural day-to-day randomness in sales.
      const noise = (Math.random() - 0.5) * stddev * 0.3;

      // WHY: The prediction formula:
      //   base = avg * weekend_multiplier + noise
      //   growth = apply tiny 0.5% growth trend per day (i * 0.005) — assumes slight upward trend
      //   `Math.max(0, ...)` ensures we never predict negative revenue.
      const predicted = Math.max(0, (avg * multiplier + noise) * (1 + i * 0.005));

      return {
        date: date.toISOString().split('T')[0],
        predictedRevenue: +predicted.toFixed(2),
        // WHY: Confidence decreases by 4% each day further into the future.
        //   Tomorrow (i=0): 90% confident. Day 7 (i=6): 90% - 24% = 66%.
        //   This reflects the real-world fact that near-future forecasts are more reliable.
        confidence: +(0.90 - i * 0.04).toFixed(2),
      };
    });

    const result = {
      forecast,
      // WHY: Report how many days of data the forecast is based on.
      //   "Based on 28 days" tells the user if the prediction is well-grounded.
      basedOnDays: values.length,
      avgDailyRevenue: +avg.toFixed(2),
      // WHY: Simple trend detection: compare the last daily value to the first.
      //   If the last day earned more than the first day → "upward" trend.
      //   Otherwise → "stable". A real ML model would do linear regression here.
      trend: values.length > 1 && values[values.length - 1] > values[0] ? 'upward' : 'stable',
    };

    // WHY: Cache for 1 hour (3600 seconds). Forecasts change slowly — hourly refresh is fine.
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // WHY: getRecommendations analyzes store data and surfaces actionable business advice.
  //   It checks three things: low stock, top selling products, and low-margin products.
  async getRecommendations(storeId: string) {
    const cacheKey = `ai:recommendations:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: Fetch three data sets IN PARALLEL using Promise.all (faster than sequential queries).
    //   - lowStockItems: all inventory records to find items below minimum stock
    //   - recentItems:   all order line items from the last 30 days (to find top sellers)
    //   - allProducts:   all active products (to find low-margin items)
    const [lowStockItems, recentItems, allProducts] = await Promise.all([

      // WHY: Fetch inventory for all active products. We use `include: { product: true }`
      //   to also load the product name/details alongside the inventory record.
      //   (include = "do a JOIN and give me the related row too")
      this.prisma.inventory.findMany({
        where: { storeId, product: { active: true } },
        include: { product: true },
      }),

      // WHY: Fetch all sold items in the last 30 days to identify the best seller.
      this.prisma.orderItem.findMany({
        where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } },
        select: { productId: true, productName: true, quantity: true, total: true },
      }),

      // WHY: Fetch all active products with price and cost to calculate gross margin.
      //   Gross margin = (price - cost) / price. Low margin = we're barely making money.
      this.prisma.product.findMany({
        where: { storeId, active: true },
        select: { id: true, name: true, price: true, cost: true },
      }),
    ]);

    // WHY: `recommendations` is an array we'll push alerts into as we find issues.
    const recommendations: any[] = [];

    // WHY: RULE 1 — LOW STOCK ALERTS
    //   Filter to items where current quantity is at or below the configured minimum.
    //   `minStock` is the "reorder point" — when stock hits this level, reorder now.
    const critical = lowStockItems.filter(i => i.quantity <= i.minStock);

    // WHY: Only show the top 3 most critical items to avoid overwhelming the user.
    //   Showing 50 restock alerts at once is unhelpful — prioritize the worst cases.
    for (const item of critical.slice(0, 3)) {
      recommendations.push({
        type: 'low_stock',
        // WHY: quantity === 0 means completely OUT OF STOCK → 'high' priority.
        //   Any non-zero quantity below minimum → 'medium' priority (running low but not gone yet).
        priority: item.quantity === 0 ? 'high' : 'medium',
        title: `Restock ${item.product.name}`,
        body: `Only ${item.quantity} units left (minimum: ${item.minStock}).`,
        icon: '📦',
        productId: item.productId,
      });
    }

    // WHY: RULE 2 — PROMOTION OPPORTUNITY (TOP SELLER BUNDLE)
    //   Build a revenue map per product (same grouping logic as reports.service.getTopProducts).
    const salesMap = new Map<string, { name: string; revenue: number; units: number }>();
    for (const item of recentItems) {
      if (!salesMap.has(item.productId)) salesMap.set(item.productId, { name: item.productName, revenue: 0, units: 0 });
      salesMap.get(item.productId)!.revenue += item.total;
      salesMap.get(item.productId)!.units += item.quantity;
    }

    // WHY: Sort by revenue descending and take the #1 product.
    //   `[0]` gets the first element of the sorted array = highest earner.
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

    // WHY: RULE 3 — LOW MARGIN ALERTS
    //   Gross margin = (price - cost) / price × 100.
    //   If margin < 25%, we're keeping less than 25 cents of every rupee earned.
    //   Threshold: only flag products that have a cost set (cost > 0) to avoid division issues.
    //   Show the 2 worst-margin products so the owner can reprice or renegotiate supplier costs.
    const lowMargin = allProducts.filter(p => p.cost > 0 && (p.price - p.cost) / p.price < 0.25).slice(0, 2);

    for (const p of lowMargin) {
      // WHY: `.toFixed(0)` rounds to 0 decimal places for a cleaner display: "18%" not "18.3%"
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

    // WHY: Cache recommendations for 1 hour. They change slowly (stock levels update
    //   as orders come in, but checking every hour is sufficient for business advice).
    await this.redis.set(cacheKey, recommendations, 3600);
    return recommendations;
  }

  // WHY: detectFraud scans the last 7 days of orders for suspicious patterns.
  //   This is rule-based fraud scoring — each suspicious signal adds "risk points".
  //   If total risk score >= 20, the order is flagged for manager review.
  async detectFraud(storeId: string) {
    const cacheKey = `ai:fraud:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: Look at the last 7 days. Fraud detection focuses on recent activity —
    //   older orders are less actionable.
    const recentOrders = await this.prisma.order.findMany({
      where: { storeId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      // WHY: `include: { items: true }` loads all line items inside each order.
      //   We need items to check for bulk quantity purchases (a fraud signal).
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    // WHY: `flags` will hold every order that crosses our risk threshold.
    const flags: any[] = [];

    // WHY: Loop through every recent order and calculate a risk score.
    for (const order of recentOrders) {

      // WHY: `reasons` collects human-readable descriptions of why this order is suspicious.
      //   e.g. ["High discount: 45%", "Cash for high-value order"]
      const reasons: string[] = [];

      // WHY: Start every order at 0 risk. We add points for each red flag found.
      let riskScore = 0;

      // WHY: SIGNAL 1 — Unusually high discount (> 30%).
      //   Legitimate discounts are usually capped (e.g. max 20%). A 40% or 50% discount
      //   might indicate a cashier is giving their friend a massive unauthorized discount.
      //   Worth 35 risk points — this is the strongest fraud signal.
      if (order.discountPct > 30) { reasons.push(`High discount: ${order.discountPct}%`); riskScore += 35; }

      // WHY: SIGNAL 2 — Very high order total (> ₹20,000).
      //   High-value transactions warrant extra scrutiny regardless of payment method.
      //   Worth 25 risk points.
      if (order.total > 20000) { reasons.push(`High value: ₹${order.total.toFixed(0)}`); riskScore += 25; }

      // WHY: SIGNAL 3 — Bulk quantity purchase (> 10 units of a single item).
      //   Retail customers rarely buy 10+ of the same item. This could indicate
      //   inventory theft (fake sale) or an unusual reseller transaction.
      //   `find()` returns the first matching item, or undefined if none.
      const bulkItem = order.items.find(i => i.quantity > 10);
      if (bulkItem) { reasons.push(`Bulk qty: ${bulkItem.quantity}x ${bulkItem.productName}`); riskScore += 20; }

      // WHY: SIGNAL 4 — Large cash payment (> ₹10,000 in cash).
      //   Cash transactions are harder to trace than card/UPI payments.
      //   A very large cash payment on a high-value order is a money laundering signal.
      //   Worth 20 risk points.
      if (order.paymentMethod === 'CASH' && order.total > 10000) {
        reasons.push(`Cash for high-value order`); riskScore += 20;
      }

      // WHY: Only include this order in the flagged list if the total risk score >= 20.
      //   A score of 20 means at least one significant red flag was found.
      //   `Math.min(100, riskScore)` caps the score at 100 — scores above 100 mean nothing extra.
      if (riskScore >= 20) {
        flags.push({ orderId: order.id, orderNumber: order.orderNumber, riskScore: Math.min(100, riskScore), reasons });
      }
    }

    const result = {
      // WHY: Sort flagged orders highest risk first, so the most suspicious appear at the top.
      flaggedOrders: flags.sort((a, b) => b.riskScore - a.riskScore),
      totalAnalyzed: recentOrders.length,
      flaggedCount: flags.length,
      analysisWindow: '7 days',
    };

    // WHY: Cache for 30 minutes (1800 seconds). Fraud data should refresh fairly often
    //   since new suspicious orders could come in throughout the day.
    await this.redis.set(cacheKey, result, 1800);
    return result;
  }

  // WHY: chat is a simple question-answering assistant using keyword matching.
  //   IMPORTANT: This is NOT a real LLM (no OpenAI/Gemini API calls).
  //   It works by scanning the user's message for known keywords and returning
  //   a pre-written, context-enriched reply. This is called a "rule-based chatbot".
  //   It's fast, free, works offline, and requires no AI API keys.
  async chat(storeId: string, message: string) {

    // WHY: Convert to lowercase once so all keyword checks below are case-insensitive.
    //   "How do I increase REVENUE?" and "increase revenue" both match.
    const lower = message.toLowerCase();

    // WHY: Load the 100 most recent completed orders to provide real business context
    //   in replies (e.g. "Your avg order is ₹450" instead of generic advice).
    const recentOrders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      // WHY: `take: 100` limits to 100 rows — enough for a meaningful average without
      //   loading thousands of rows into memory.
      take: 100,
      select: { total: true },
    });

    // WHY: Sum all order totals to get total revenue for context.
    const totalRevenue = recentOrders.reduce((s, o) => s + o.total, 0);

    // WHY: Average order value = total revenue / number of orders.
    //   Used in the revenue-related reply to make advice specific to this store.
    const avgOrder = recentOrders.length ? totalRevenue / recentOrders.length : 0;

    // WHY: `reply` will hold the response we send back. We pick one based on keywords.
    let reply: string;

    // WHY: Each `if/else` block is a "topic handler" — it checks if the message
    //   matches a specific business question and returns an appropriate answer.

    if (lower.includes('best') && (lower.includes('sell') || lower.includes('product'))) {
      // WHY: User asked about best sellers → redirect them to the top-products report.
      reply = 'Your top-performing products are available at GET /api/v1/reports/top-products. Filter by the last 30 days.';

    } else if (lower.includes('revenue') || lower.includes('increase') || lower.includes('improve')) {
      // WHY: User asked about growing revenue → give data-driven actionable advice.
      //   We include their actual average order value to make the advice feel personal.
      reply = `Your avg order value is ₹${avgOrder.toFixed(0)}. To grow: (1) bundle top sellers, (2) offer loyalty discounts, (3) run flash sales on slow movers.`;

    } else if (lower.includes('stock') || lower.includes('inventory')) {
      // WHY: User asked about inventory → point them to the low-stock API.
      reply = 'Check GET /api/v1/inventory/low-stock for items that need restocking.';

    } else if (lower.includes('customer') || lower.includes('loyal')) {
      // WHY: User asked about customers → suggest a win-back campaign strategy.
      reply = 'Customers with high loyalty points but no recent orders are prime win-back candidates. Check GET /api/v1/customers.';

    } else if (lower.includes('fraud') || lower.includes('suspicious')) {
      // WHY: User asked about fraud → direct them to the fraud detection endpoint.
      reply = 'Use GET /api/v1/ai/fraud-detection for flagged orders with risk scores.';

    } else if (lower.includes('predict') || lower.includes('forecast')) {
      // WHY: User asked about predictions → point them to the sales prediction endpoint.
      reply = 'GET /api/v1/ai/sales-prediction returns a 7-day revenue forecast with daily confidence scores.';

    } else {
      // WHY: If no keyword matched, fall back to a general summary with real store numbers.
      //   This is better than a "I don't understand" message — it still provides value.
      reply = `Processed ${recentOrders.length} orders totalling ₹${totalRevenue.toFixed(0)}. Ask me about sales, inventory, customers, or fraud detection.`;
    }

    // WHY: Return the reply with a timestamp so the frontend can display "answered at X time".
    return { reply, timestamp: new Date().toISOString() };
  }
}
