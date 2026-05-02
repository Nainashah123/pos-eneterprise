// WHY: @Injectable() registers this class with NestJS's dependency injection system.
//   NestJS can then create one shared instance and inject it wherever it's needed.
import { Injectable } from '@nestjs/common';

// WHY: PrismaService is our database client — all SQL queries go through it.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: RedisService lets us cache expensive query results in memory (Redis).
//   Reports involve complex aggregations over thousands of rows. Caching means
//   the second request for the same report gets the answer in milliseconds
//   instead of re-running the database query every time.
import { RedisService } from '../../redis/redis.service';

// WHY: DateRangeDto contains the optional `from` and `to` date strings
//   that the daily-sales endpoint accepts.
import { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class ReportsService {

  // WHY: CACHE_TTL = 300 seconds = 5 minutes. Report data doesn't change every second,
  //   so it's safe to serve a cached version for 5 minutes before recalculating.
  //   This dramatically reduces database load during peak business hours.
  private readonly CACHE_TTL = 300; // 5 min

  // WHY: We inject both PrismaService (for DB queries) and RedisService (for caching).
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // WHY: getDashboardKpis calculates the headline numbers shown at the top of the dashboard:
  //   revenue, orders, new customers, and average order value — all for today vs yesterday.
  async getDashboardKpis(storeId: string) {

    // WHY: We build a cache key that includes storeId so each store has its own cache entry.
    //   "reports:kpis:store-abc" for Store A, "reports:kpis:store-xyz" for Store B.
    const cacheKey = `reports:kpis:${storeId}`;

    // WHY: Check Redis first. If this data was cached recently, return it immediately
    //   and skip all the database queries below. This is called "cache-aside" pattern.
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: We need to compare "today" vs "yesterday", so we calculate exact boundaries.
    //   `setHours(0, 0, 0, 0)` sets the time to midnight (start of today).
    //   Result: todayStart = today at 00:00:00.000
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // WHY: Copy todayStart into a new Date, then subtract one day.
    //   Result: yesterdayStart = yesterday at 00:00:00.000
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // WHY: `Promise.all([...])` runs all four database queries IN PARALLEL.
    //   Without Promise.all, they would run one after another (slow).
    //   With it, all four queries fire at the same time and we wait for all to finish.
    //   This is much faster — total time = slowest query, not sum of all queries.
    const [todayOrders, yesterdayOrders, totalProducts, totalCustomers] = await Promise.all([

      // WHY: Fetch all COMPLETED orders from today midnight onwards.
      //   `gte` = "greater than or equal to" — a date range filter.
      //   We only select `total` and `customerId` — the two fields we need for KPIs.
      //   Selecting fewer fields = smaller data transfer from database = faster.
      this.prisma.order.findMany({
        where: { storeId, status: 'COMPLETED', createdAt: { gte: todayStart } },
        select: { total: true, customerId: true },
      }),

      // WHY: Fetch yesterday's COMPLETED orders.
      //   `gte: yesterdayStart, lt: todayStart` = "from yesterday midnight to today midnight"
      //   This is how you query a full day: from 00:00:00 (inclusive) to next day 00:00:00 (exclusive).
      this.prisma.order.findMany({
        where: { storeId, status: 'COMPLETED', createdAt: { gte: yesterdayStart, lt: todayStart } },
        select: { total: true, customerId: true },
      }),

      // WHY: Count total active products in the store for the product KPI card.
      //   `.count()` returns a plain number — no need to load all rows into memory.
      this.prisma.product.count({ where: { storeId, active: true } }),

      // WHY: Count total active customers — shown as a separate KPI card.
      this.prisma.customer.count({ where: { storeId, active: true } }),
    ]);

    // WHY: `calc` is a helper function (defined inline) that takes an array of orders
    //   and returns 4 computed metrics. We reuse it for both today and yesterday
    //   to avoid duplicating the calculation logic.
    const calc = (orders: { total: number; customerId: string | null }[]) => ({

      // WHY: `reduce` sums all the `total` fields. It starts at 0 and adds each order's total.
      //   This gives us total revenue: 0 + order1.total + order2.total + ...
      revenue: orders.reduce((s, o) => s + o.total, 0),

      // WHY: `orders.length` is just how many orders are in the array — the order count.
      orders: orders.length,

      // WHY: `new Set(...)` creates a set of unique customer IDs.
      //   A Set automatically removes duplicates. So if customer A placed 3 orders today,
      //   they only count as 1 unique customer. `.size` gives the count of unique entries.
      //   We filter out null first (orders with no linked customer account).
      customers: new Set(orders.filter(o => o.customerId).map(o => o.customerId!)).size,

      // WHY: Average order value = total revenue / number of orders.
      //   The `orders.length ? ... : 0` guard prevents division by zero if there are no orders.
      avgOrder: orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
    });

    // WHY: Run the same calculation for both today's and yesterday's orders.
    const today = calc(todayOrders);
    const yesterday = calc(yesterdayOrders);

    // WHY: `pct` calculates the percentage change from b (yesterday) to a (today).
    //   Formula: ((today - yesterday) / yesterday) * 100
    //   If yesterday = 0, we can't divide by zero, so we return 0 (no change).
    //   `.toFixed(1)` rounds to 1 decimal place, e.g. 12.3%.
    //   The leading `+` converts the string returned by toFixed back to a number.
    const pct = (a: number, b: number) => b === 0 ? 0 : +((((a - b) / b) * 100).toFixed(1));

    const result = {
      // WHY: `.toFixed(2)` rounds to 2 decimal places (like currency: ₹1234.56).
      //   The `+` prefix converts the string back to a number (toFixed returns a string).
      todayRevenue: +today.revenue.toFixed(2),
      todayOrders: today.orders,
      todayCustomers: today.customers,
      todayAvgOrder: +today.avgOrder.toFixed(2),

      // WHY: Change metrics power the "up/down" arrows on dashboard KPI cards.
      //   revenueChange: +12.5 means revenue is up 12.5% vs yesterday.
      //   revenueChange: -5.0 means revenue is down 5% vs yesterday.
      revenueChange: pct(today.revenue, yesterday.revenue),
      ordersChange: pct(today.orders, yesterday.orders),
      customersChange: pct(today.customers, yesterday.customers),
      avgOrderChange: pct(today.avgOrder, yesterday.avgOrder),

      // WHY: These are store-level totals (not just today) — shown in summary cards.
      totalProducts,
      totalCustomers,
    };

    // WHY: Store the result in Redis for 60 seconds (1 minute) before it expires.
    //   KPIs are time-sensitive (they show "today's" data) so we use a shorter TTL
    //   of 60s here instead of the default CACHE_TTL of 5 minutes.
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  // WHY: getDailySales returns a data point (revenue + order count) for each day
  //   in the requested date range. Used to draw the line/bar chart on the dashboard.
  async getDailySales(storeId: string, dto: DateRangeDto) {

    // WHY: If no `from` date is provided, default to 30 days ago.
    //   `Date.now()` = milliseconds since 1970. `30 * 86400000` = 30 days in milliseconds.
    const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 86400000);

    // WHY: If no `to` date is provided, default to right now.
    const to = dto.to ? new Date(dto.to) : new Date();

    // WHY: Set `to` to the end of the day (23:59:59.999) so the last day is included fully.
    //   Without this, "to = 2024-01-31" would only include up to midnight on Jan 31,
    //   missing any orders placed during the day on Jan 31.
    to.setHours(23, 59, 59, 999);

    // WHY: Build a cache key from the store and exact date range.
    //   `.split('T')[0]` extracts just the YYYY-MM-DD part from an ISO timestamp.
    //   So the key looks like: "reports:daily:store-abc:2024-01-01:2024-01-31"
    const cacheKey = `reports:daily:${storeId}:${from.toISOString().split('T')[0]}:${to.toISOString().split('T')[0]}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: Fetch all completed orders within the date range.
    //   `gte` = on or after `from`, `lte` = on or before `to`.
    //   We only need `total` (for revenue) and `createdAt` (to know which day it belongs to).
    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      select: { total: true, createdAt: true },
      // WHY: Sort oldest to newest so the chart renders left-to-right chronologically.
      orderBy: { createdAt: 'asc' },
    });

    // WHY: `dayMap` is a dictionary (Map) where the key is a date string ("2024-01-15")
    //   and the value is the accumulated revenue and order count for that day.
    //   We build this by looping through every order and grouping them by date.
    const dayMap = new Map<string, { revenue: number; orders: number }>();

    for (const o of orders) {
      // WHY: Convert the full timestamp to just a date string: "2024-01-15T10:30:00Z" → "2024-01-15"
      const date = o.createdAt.toISOString().split('T')[0];

      // WHY: If this date doesn't exist in the map yet, create an entry with zeroes.
      if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, orders: 0 });

      // WHY: Add this order's total to the running revenue sum for this day.
      dayMap.get(date)!.revenue += o.total;

      // WHY: Increment the order count for this day by 1.
      dayMap.get(date)!.orders += 1;
    }

    // WHY: Convert the Map into an array of plain objects that JSON can serialize.
    //   `.toFixed(2)` rounds revenue to 2 decimal places for clean currency display.
    //   `.sort()` ensures dates are in ascending order (oldest first).
    const result = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, revenue: +v.revenue.toFixed(2), orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // WHY: Cache this result for CACHE_TTL (5 minutes). Daily sales charts don't need
    //   real-time accuracy — a 5-minute delay is acceptable.
    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // WHY: getMonthlyRevenue returns one revenue figure per month for the last 12 months.
  //   This powers a yearly bar chart (Jan, Feb, Mar... Dec).
  async getMonthlyRevenue(storeId: string) {
    const cacheKey = `reports:monthly:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: Calculate the date 12 months ago from today.
    //   `setMonth(month - 12)` subtracts 12 months. JavaScript handles year rollovers automatically.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // WHY: Fetch all completed orders from the past 12 months.
    //   We only need `total` and `createdAt` — we'll group by month in memory.
    const orders = await this.prisma.order.findMany({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: twelveMonthsAgo } },
      select: { total: true, createdAt: true },
    });

    // WHY: `monthMap` groups revenue by "YYYY-MM" key.
    //   e.g. all January 2024 orders accumulate under key "2024-01".
    const monthMap = new Map<string, number>();

    for (const o of orders) {
      // WHY: `.substring(0, 7)` extracts "YYYY-MM" from a full ISO string like "2024-01-15T10:30:00Z".
      //   This is our "group by month" logic — same month = same key.
      const key = o.createdAt.toISOString().substring(0, 7); // YYYY-MM

      // WHY: `(monthMap.get(key) || 0) + o.total` adds the current order total to the
      //   running sum. If the key doesn't exist yet, start from 0.
      monthMap.set(key, (monthMap.get(key) || 0) + o.total);
    }

    // WHY: Convert Map to array, round revenue, and sort chronologically.
    const result = Array.from(monthMap.entries())
      .map(([month, revenue]) => ({ month, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // WHY: getTopProducts finds which products generated the most revenue in the last 30 days.
  //   This is a "leaderboard" — used to spotlight your best sellers.
  async getTopProducts(storeId: string, limit = 10) {

    // WHY: Include `limit` in the cache key so "top 5" and "top 10" are cached separately.
    const cacheKey = `reports:top-products:${storeId}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // WHY: `Date.now() - 30 * 86400000` = 30 days ago in milliseconds.
    //   86400000 = 1 day in milliseconds (60 * 60 * 24 * 1000).
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // WHY: We query `orderItem` (the line items inside orders), not `order` directly.
    //   To find which products sold the most, we need the item-level data.
    //   The `where` filter walks the relation: only items from COMPLETED orders
    //   that belong to this store AND were created in the last 30 days.
    const items = await this.prisma.orderItem.findMany({
      where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } },
      select: { productId: true, productName: true, quantity: true, total: true },
    });

    // WHY: Group all the order items by productId to sum up revenue and units sold per product.
    //   Same product can appear across many different orders — we want the combined totals.
    const map = new Map<string, { name: string; revenue: number; units: number }>();

    for (const item of items) {
      // WHY: First time we see this productId? Create its entry with zeroes.
      if (!map.has(item.productId)) map.set(item.productId, { name: item.productName, revenue: 0, units: 0 });

      // WHY: Add this line item's revenue to the product's running total.
      map.get(item.productId)!.revenue += item.total;

      // WHY: Add the quantity sold in this order to the product's total units sold.
      map.get(item.productId)!.units += item.quantity;
    }

    // WHY: Convert Map → array → sort by revenue descending (highest earner first) → take top N.
    //   `sort((a, b) => b.revenue - a.revenue)` sorts highest to lowest.
    //   `.slice(0, limit)` takes only the top `limit` items (default 10).
    const result = Array.from(map.entries())
      .map(([productId, v]) => ({ productId, productName: v.name, revenue: +v.revenue.toFixed(2), unitsSold: v.units }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // WHY: getSalesByCategory breaks down revenue by product category (e.g. Beverages, Food, Electronics).
  //   Used for a pie chart showing which categories contribute most to revenue.
  async getSalesByCategory(storeId: string) {
    const cacheKey = `reports:by-category:${storeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // WHY: We need each item's total (for revenue), quantity (for units sold),
    //   AND its product's category name. Prisma's nested `select` lets us reach
    //   through the item → product → category relationship in one query.
    //   Without this nesting we'd need multiple separate queries.
    const items = await this.prisma.orderItem.findMany({
      where: { order: { storeId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } },
      select: { total: true, quantity: true, product: { select: { category: { select: { name: true } } } } },
    });

    // WHY: Group items by category name, accumulating revenue and units per category.
    const map = new Map<string, { revenue: number; units: number }>();

    for (const item of items) {
      // WHY: Navigate the nested relation: item.product?.category?.name
      //   The `?.` is optional chaining — if product or category is null, it returns undefined.
      //   `|| 'Uncategorized'` provides a fallback for products without a category.
      const cat = item.product?.category?.name || 'Uncategorized';

      if (!map.has(cat)) map.set(cat, { revenue: 0, units: 0 });
      map.get(cat)!.revenue += item.total;
      map.get(cat)!.units += item.quantity;
    }

    // WHY: Sort by revenue descending — the highest-earning category appears first.
    const result = Array.from(map.entries())
      .map(([category, v]) => ({ category, revenue: +v.revenue.toFixed(2), units: v.units }))
      .sort((a, b) => b.revenue - a.revenue);

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
