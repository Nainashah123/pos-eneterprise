// WHY: NestJS exception classes that map to HTTP status codes:
//   - Injectable        → registers this class with NestJS dependency injection
//   - NotFoundException → throws HTTP 404 (resource doesn't exist)
//   - BadRequestException → throws HTTP 400 (request is invalid / can't be processed)
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

// WHY: PrismaService is our database client — all SQL queries go through it.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: ProcessPaymentDto defines what fields are expected in the request body
//   when processing a payment (method, cashGiven, reference number, etc.).
import { ProcessPaymentDto } from './dto/process-payment.dto';

// WHY: PaymentStatus is the Prisma-generated enum for payment states.
//   Values: PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED, PaymentStatus.FAILED
//   Using an enum (not raw strings like "SUCCESS") means TypeScript catches typos.
import { PaymentStatus } from '@prisma/client';

// WHY: @Injectable() tells NestJS this class can be provided to other classes.
@Injectable()
export class PaymentsService {

  // WHY: PrismaService is injected by NestJS — no need to create it manually.
  constructor(private readonly prisma: PrismaService) {}

  // WHY: findAll returns the 100 most recent payments for a store.
  async findAll(storeId: string) {
    return this.prisma.payment.findMany({
      // WHY: Filter by storeId — each store only sees its own payment records.
      where: { storeId },

      // WHY: `include: { order: { select: {...} } }` performs a JOIN with the orders table.
      //   Instead of returning just the payment, we also attach the related order's
      //   number, total, and status — very useful for the payment list UI.
      //   We use nested `select` to only pull the 3 order fields we actually need,
      //   not the entire order object.
      include: { order: { select: { orderNumber: true, total: true, status: true } } },

      // WHY: Newest payments first — the most recent transactions are most relevant.
      orderBy: { createdAt: 'desc' },

      // WHY: `take: 100` limits results to 100 rows. For a payment list page this is
      //   more than enough, and it prevents accidentally loading tens of thousands of rows.
      take: 100,
    });
  }

  // WHY: findOne fetches a single payment by its ID, scoped to the store.
  async findOne(storeId: string, id: string) {
    const p = await this.prisma.payment.findFirst({
      // WHY: Both `id` AND `storeId` must match — security boundary.
      //   Checking storeId ensures Store A can't look up Store B's payment by guessing a UUID.
      where: { id, storeId },
      // WHY: `include: { order: true }` loads the full related order — useful for a
      //   payment detail page that shows everything about the transaction.
      include: { order: true },
    });

    // WHY: If no payment found (wrong ID or wrong store), return HTTP 404.
    //   We never return null — NestJS handles the error response automatically.
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  // WHY: processForOrder settles the payment for a given order.
  //   The flow is: create order → payment record is auto-created as PENDING →
  //   cashier collects money → call this endpoint → payment becomes SUCCESS.
  async processForOrder(storeId: string, orderId: string, dto: ProcessPaymentDto) {

    // WHY: Look up the payment record by orderId. Each order has exactly one payment record,
    //   created automatically when the order is placed (with status PENDING).
    //   `findUnique` uses the unique constraint on orderId (one payment per order).
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });

    // WHY: If no payment record exists for this orderId, return 404.
    //   This shouldn't normally happen (order creation makes the payment), but we guard it.
    if (!payment) throw new NotFoundException('Payment record not found for this order');

    // WHY: If the payment is already SUCCESS, reject the request with 400 Bad Request.
    //   Processing the same payment twice would cause double-charging or accounting errors.
    //   This is an "idempotency check" — prevent the same action from happening twice.
    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already processed');
    }

    // WHY: Calculate change to give back for cash payments.
    //   If method is CASH and cashGiven is provided:
    //     changeGiven = cashGiven - amount (clamped to 0 minimum — never negative change)
    //   For card/UPI payments, there's no physical cash involved, so changeGiven = null.
    //   Example: Order = ₹450, customer gives ₹500 → change = ₹50
    const changeGiven = dto.method === 'CASH' && dto.cashGiven
      ? Math.max(0, dto.cashGiven - payment.amount)
      : null;

    // WHY: Update the payment record with all the settlement details.
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        // WHY: Record which payment method was used (CASH, CARD, UPI, STRIPE).
        method: dto.method,

        // WHY: Mark as SUCCESS — this is the key status change. After this the order is paid.
        status: PaymentStatus.SUCCESS,

        // WHY: `reference` stores the card transaction ID or UPI reference number.
        //   For CASH payments this is typically null (no external reference).
        //   For CARD/UPI this gives the store a way to cross-check with their bank statement.
        reference: dto.reference,

        // WHY: Record how much cash was physically handed over (for receipt printing and
        //   cash drawer reconciliation at end of shift).
        cashGiven: dto.cashGiven || null,

        // WHY: Record the calculated change — printed on the receipt and tracked for
        //   cash drawer accuracy. The cashier should give back exactly this amount.
        changeGiven,

        // WHY: Stamp the exact moment the payment was processed.
        //   This differs from `createdAt` (when the order was placed) and lets you track
        //   how long it took from order creation to payment collection.
        processedAt: new Date(),
      },
    });
  }

  // WHY: refund changes a payment's status from SUCCESS to REFUNDED.
  //   The payment record is kept (for audit trail) — we never delete financial records.
  async refund(storeId: string, id: string) {

    // WHY: Fetch the payment, verifying it belongs to this store (findOne checks storeId).
    //   Also reuses the findOne logic so we don't repeat the "not found" check.
    const p = await this.findOne(storeId, id);

    // WHY: You can only refund a SUCCESSFUL payment.
    //   Refunding a PENDING payment doesn't make sense (nothing was collected yet).
    //   Refunding a REFUNDED payment would create a double-refund (sending money twice).
    if (p.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    // WHY: Update only the status field to REFUNDED. All other payment details stay intact
    //   so there's a complete audit trail: original amount, method, who processed it, when.
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  // WHY: getSummary provides aggregated payment statistics for the dashboard/reports.
  //   It answers: "How much did we collect in total? How much today? Which methods?"
  async getSummary(storeId: string) {

    // WHY: Set `today` to midnight so we can filter "today's" payments separately.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // WHY: Run three database queries IN PARALLEL using Promise.all.
    //   Without Promise.all they'd run one after another (slow).
    //   With it they all execute at the same time — total time = slowest query only.
    const [total, byMethod, todayTotal] = await Promise.all([

      // WHY: `aggregate` computes summary statistics across multiple rows in ONE query.
      //   Instead of loading all payments and summing in JavaScript, we let the database
      //   do the math — much faster for thousands of records.
      //   `_sum: { amount: true }` = add up all the `amount` column values.
      //   `_count: true` = count how many rows matched.
      this.prisma.payment.aggregate({
        where: { storeId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },   // WHY: Total revenue across all time
        _count: true,             // WHY: Total number of successful transactions
      }),

      // WHY: `groupBy` is like a SQL "GROUP BY" — it groups rows by a column and
      //   runs aggregates within each group.
      //   Here: group all payments by `method` (CASH, CARD, UPI, STRIPE),
      //   then sum the amount and count transactions for each method separately.
      //   Result: [{ method: 'CASH', _sum: { amount: 50000 }, _count: 120 }, { method: 'UPI', ... }]
      //   This tells you exactly how much was collected via each payment method.
      this.prisma.payment.groupBy({
        by: ['method'],           // WHY: One row per payment method in the result
        where: { storeId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },   // WHY: Revenue per method
        _count: true,             // WHY: Transaction count per method
      }),

      // WHY: Same aggregate as `total` but filtered to today only (createdAt >= midnight).
      //   This powers the "Today's Revenue" KPI card on the dashboard.
      this.prisma.payment.aggregate({
        where: { storeId, status: PaymentStatus.SUCCESS, createdAt: { gte: today } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      // WHY: `total._sum.amount` is the total revenue. `|| 0` handles the case where
      //   there are no successful payments yet (Prisma returns null for sum of empty set).
      totalRevenue: total._sum.amount || 0,

      // WHY: `total._count` is the total number of successful payment transactions.
      totalTransactions: total._count,

      // WHY: Today's revenue and transaction count for the dashboard "today's totals" cards.
      todayRevenue: todayTotal._sum.amount || 0,
      todayTransactions: todayTotal._count,

      // WHY: Map each groupBy result into a cleaner shape.
      //   The raw `_sum` and `_count` Prisma keys are renamed to `revenue` and `transactions`
      //   for cleaner frontend consumption.
      //   Example output: [{ method: 'CASH', revenue: 50000, transactions: 120 }, ...]
      byMethod: byMethod.map(m => ({
        method: m.method,
        revenue: m._sum.amount || 0,    // WHY: `|| 0` handles null for methods with no amounts
        transactions: m._count,
      })),
    };
  }
}
