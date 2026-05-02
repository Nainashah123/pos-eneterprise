// WHY: @Injectable marks this class as a NestJS "provider" — meaning NestJS manages
// its lifecycle and can inject it into other classes automatically.
// NotFoundException sends a 404 response; BadRequestException sends a 400 response.
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

// WHY: PrismaService is our database client. It gives us methods to query every table
// defined in schema.prisma — prisma.order, prisma.product, prisma.inventory, etc.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: We import InventoryService because when an order is COMPLETED we need to
// deduct stock. Instead of duplicating that logic here, we reuse the service that
// already knows how to do it — this is the Single Responsibility Principle.
import { InventoryService } from '../inventory/inventory.service';

// WHY: We import CustomersService to update the customer's loyalty points and spending
// total after an order completes — again, reusing existing logic instead of duplicating it.
import { CustomersService } from '../customers/customers.service';

// WHY: OrdersGateway is a WebSocket gateway. It can push real-time events to the
// browser (e.g. "new order arrived", "stock is low") without the browser polling.
import { OrdersGateway } from './orders.gateway';

// WHY: DTOs describe the exact shape of data that arrives from the HTTP request.
// TypeScript types give us compile-time safety; NestJS validation gives us runtime safety.
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

// WHY: These enums come from Prisma and mirror the database column types exactly.
// Using enums prevents magic strings — we write OrderStatus.COMPLETED, not "COMPLETED".
import { OrderStatus, PaymentStatus, StockMovementType } from '@prisma/client';

// WHY: @Injectable() lets NestJS inject this service into the controller (and anywhere else
// that declares it in their constructor). NestJS creates one shared instance for the whole app.
@Injectable()
export class OrdersService {
  // WHY: Dependency Injection — we declare what we need (PrismaService, InventoryService, etc.)
  // and NestJS provides them. We never call `new PrismaService()` manually.
  // `private readonly` means these references cannot be accidentally reassigned later.
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly gateway: OrdersGateway,
  ) {}

  // WHY: async/await is used throughout because database queries are I/O operations —
  // they take time, and async lets Node.js handle other requests while waiting.
  async findAll(storeId: string, dto: PaginationDto & { status?: OrderStatus }) {
    // WHY: We destructure the DTO and provide defaults: page 1, 20 items per page.
    // This means callers can omit these params and still get sensible results.
    const { page = 1, limit = 20, search, status } = dto;

    // WHY: Pagination math — if we want page 3 with 20 items per page,
    // we must skip the first 40 rows. "skip" is the SQL OFFSET equivalent.
    const skip = (page - 1) * limit;

    // WHY: We start the WHERE clause with storeId so every query is automatically
    // scoped to this store. Users can never see orders from other stores.
    const where: any = { storeId };

    // WHY: Only add the status filter to the WHERE clause if the caller actually
    // passed a status value. If we always included it, we'd filter out everything
    // when status is undefined.
    if (status) where.status = status;

    // WHY: If there is a search term, we use OR to match against multiple fields —
    // the order number OR the customer's name. 'insensitive' mode means "CASH" and "cash" both match.
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        // WHY: This searches inside a related table (customer) — Prisma follows the
        // foreign key relationship and filters by the joined record's name.
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // WHY: Promise.all runs BOTH database queries at the same time (in parallel) instead
    // of one after the other. The first query fetches the page of rows; the second
    // counts how many rows match in total. Running them together halves the wait time.
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,         // WHY: skip tells Prisma how many rows to skip (the previous pages)
        take: limit,  // WHY: take limits how many rows to return (the page size)

        // WHY: include is like a SQL JOIN — it fetches related records in the same query.
        // Without this, items/customer/payment would be null; we'd need extra queries.
        // cashier: { select: { name: true } } fetches ONLY the name, not the password hash etc.
        include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },

        // WHY: orderBy ensures the newest orders appear first on every page.
        orderBy: { createdAt: 'desc' },
      }),
      // WHY: count() returns just the number — much faster than fetching all rows
      // just to call .length on them. We need total to calculate totalPages on the frontend.
      this.prisma.order.count({ where }),
    ]);

    // WHY: We return a standard pagination envelope so the frontend always knows
    // how many pages exist (totalPages) and which page it is on (page).
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(storeId: string, id: string) {
    // WHY: findFirst with BOTH id AND storeId ensures a user from Store A
    // cannot fetch an order from Store B just by guessing its UUID.
    const order = await this.prisma.order.findFirst({
      where: { id, storeId },
      include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },
    });

    // WHY: If Prisma returns null (order not found or belongs to a different store),
    // we throw NotFoundException which NestJS automatically turns into a 404 HTTP response.
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(storeId: string, cashierId: string, dto: CreateOrderDto) {
    // WHY: Verify the store exists first. If storeId somehow refers to a non-existent
    // store we want to fail fast with a clear error rather than get a cryptic DB error.
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    // WHY: Extract all product IDs from the order items so we can fetch
    // them all in ONE database query instead of querying inside a loop (N+1 problem).
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      // WHY: { in: productIds } is SQL's "WHERE id IN (...)" — fetches all matching rows at once.
      // We also filter by storeId and active:true so inactive or foreign-store products are rejected.
      where: { id: { in: productIds }, storeId, active: true },

      // WHY: include: { inventory: true } fetches the stock count alongside each product
      // so we can check availability without a second query.
      include: { inventory: true },
    });

    // WHY: If the database returned fewer products than we asked for, some product IDs
    // were invalid, inactive, or belong to another store. Reject the whole order.
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    // WHY: A Map gives O(1) lookup by productId. Without it we'd have to scan the
    // products array with .find() for every item in the order — slow with large catalogs.
    const productMap = new Map(products.map(p => [p.id, p]));

    // WHY: Loop over every item in the order to check there is enough stock BEFORE
    // creating the order. We never want to accept payment and then discover we can't fulfil it.
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      // WHY: inventory might be null if the product has no inventory record yet — default to 0.
      const stock = product.inventory?.quantity || 0;
      if (stock < item.quantity) {
        // WHY: Include the product name and available quantity in the error so the
        // cashier knows exactly which item caused the problem.
        throw new BadRequestException(`Insufficient stock for ${product.name}: ${stock} available`);
      }
    }

    // WHY: Now we calculate totals. subtotal starts at 0 and we add each line item's value.
    let subtotal = 0;

    // WHY: We build the orderItems array that will be stored in the database.
    // We snapshot productName and sku HERE so the order record is accurate even if
    // the product is later renamed or deleted.
    const orderItems = dto.items.map(item => {
      const product = productMap.get(item.productId)!;
      const discount = item.discount || 0; // WHY: Default to 0% discount if not provided.

      // WHY: Line item total = price × quantity, then reduce by the discount percentage.
      // (1 - discount/100) turns a 10% discount into a multiplier of 0.9.
      const itemTotal = product.price * item.quantity * (1 - discount / 100);
      subtotal += itemTotal;

      return {
        productId: item.productId,
        productName: product.name,  // WHY: Snapshot the name at time of sale
        sku: product.sku,           // WHY: Snapshot the SKU at time of sale
        price: product.price,       // WHY: Snapshot the price at time of sale
        quantity: item.quantity,
        discount,
        // WHY: +itemTotal.toFixed(2) rounds to 2 decimal places and converts back to a number
        // (toFixed returns a string, the + prefix coerces it to number).
        total: +itemTotal.toFixed(2),
      };
    });

    // WHY: Apply the order-level discount percentage on top of the already-discounted subtotal.
    const discountPct = dto.discountPct || 0;
    const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
    const afterDiscount = subtotal - discountAmt;

    // WHY: Tax rate comes from the store's settings, not from the client request.
    // This prevents the frontend from sending a tax rate of 0 to avoid paying tax.
    const taxPct = store.taxRate;
    const taxAmt = +(afterDiscount * taxPct / 100).toFixed(2);
    const total = +(afterDiscount + taxAmt).toFixed(2);

    // WHY: Generate a short, human-readable order number using the current timestamp
    // encoded in base-36 (alphanumeric) and uppercased. e.g. "ORD-LVK3M2".
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // WHY: $transaction wraps multiple database writes into a single atomic operation.
    // "Atomic" means ALL operations succeed together or ALL are rolled back together.
    // Without a transaction, if creating the order succeeded but creating the payment failed,
    // we'd have an order with no payment record — corrupted data.
    const order = await this.prisma.$transaction(async (tx) => {
      // WHY: tx is the "transaction client" — we use tx.order instead of this.prisma.order
      // so all writes inside here are part of the same transaction.
      const newOrder = await tx.order.create({
        data: {
          storeId,
          orderNumber,
          cashierId,
          customerId: dto.customerId || null, // WHY: Customer is optional — walk-in sales have no customer ID
          status: OrderStatus.PENDING,        // WHY: New orders always start as PENDING, never immediately COMPLETED
          subtotal: +subtotal.toFixed(2),
          discountPct,
          discountAmt,
          taxPct,
          taxAmt,
          total,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,

          // WHY: items: { create: [...] } is Prisma's "nested write" — it inserts all
          // order items in the same query, all inside the same transaction.
          items: { create: orderItems },

          // WHY: payment: { create: {...} } simultaneously creates the related payment
          // record. One transaction, two tables, zero partial state.
          payment: {
            create: {
              storeId,
              method: dto.paymentMethod,
              amount: total,
              status: PaymentStatus.PENDING, // WHY: Payment starts PENDING until order is COMPLETED
              cashGiven: dto.cashGiven || null,
              // WHY: Calculate change due — Math.max(0,...) prevents negative change if cashGiven < total
              changeGiven: dto.cashGiven ? Math.max(0, dto.cashGiven - total) : null,
            },
          },
        },
        // WHY: We include related data in the return value so the frontend gets the
        // full order object immediately without needing to make a second GET request.
        include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },
      });
      return newOrder;
    });

    // WHY: After the DB transaction commits, we push a WebSocket event to ALL clients
    // watching this store. This lets other cashier screens update in real time.
    this.gateway.emitNewOrder(storeId, order);
    return order;
  }

  async updateStatus(storeId: string, id: string, dto: UpdateOrderStatusDto) {
    // WHY: Reuse findOne so we get automatic 404 handling and storeId scoping.
    // We also need the full order object (especially order.items and order.customerId)
    // for the logic below.
    const order = await this.findOne(storeId, id);

    // WHY: Update the order's status field in the database.
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true, customer: true, payment: true },
    });

    // WHY: When an order is marked COMPLETED, three things must happen:
    // 1. Deduct stock from inventory.
    // 2. Update the customer's loyalty points and total spending.
    // 3. Mark the payment as successful.
    // We only do these when the status becomes COMPLETED — not for every status change.
    if (dto.status === OrderStatus.COMPLETED) {
      // WHY: Deduct the stock for every item in this order.
      // We pass the orderId so the service can look up the items itself.
      await this.inventoryService.deductStockForOrder(storeId, id);

      // WHY: Only update loyalty/spending if this order was linked to a customer.
      // Guest/walk-in orders have no customerId so we skip this step.
      if (order.customerId) {
        await this.customersService.updateAfterOrder(storeId, order.customerId, order.total);
      }

      // WHY: Mark the payment record as SUCCESS and record when it was processed.
      await this.prisma.payment.update({
        where: { orderId: id },
        data: { status: PaymentStatus.SUCCESS, processedAt: new Date() },
      });

      // WHY: After stock is deducted, check every item in the order to see if any
      // product has dropped to or below its minimum stock threshold.
      for (const item of order.items) {
        const inv = await this.prisma.inventory.findFirst({
          where: { productId: item.productId },
          // WHY: include: { product: true } fetches the product name in the same query
          // so we can include it in the low-stock alert without an extra DB call.
          include: { product: true },
        });

        // WHY: If inventory is at or below minStock, emit a WebSocket alert.
        // This is what makes the "Low Stock" warning appear on screen in real time.
        if (inv && inv.quantity <= inv.minStock) {
          this.gateway.emitLowStockAlert(storeId, item.productId, item.productName, inv.quantity);
        }
      }
    }

    // WHY: If the order is CANCELLED or REFUNDED, we need to update the payment status
    // accordingly — a cancelled order is a FAILED payment; a refunded order is a REFUNDED payment.
    if (dto.status === OrderStatus.CANCELLED || dto.status === OrderStatus.REFUNDED) {
      await this.prisma.payment.update({
        where: { orderId: id },
        // WHY: Ternary decides which PaymentStatus to use based on the new order status.
        data: { status: dto.status === OrderStatus.REFUNDED ? PaymentStatus.REFUNDED : PaymentStatus.FAILED },
      });
    }

    // WHY: Emit a WebSocket event so every connected client (e.g. manager dashboard)
    // sees the status change instantly without refreshing the page.
    this.gateway.emitOrderStatusUpdate(storeId, id, dto.status);
    return updated;
  }
}
