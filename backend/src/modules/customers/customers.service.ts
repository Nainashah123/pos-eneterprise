// WHY: @Injectable marks this class as a NestJS provider — it can be injected into
// other classes via their constructors. NestJS manages one shared instance.
// NotFoundException sends HTTP 404 when a requested record doesn't exist.
import { Injectable, NotFoundException } from '@nestjs/common';

// WHY: PrismaService is our database access layer. It gives us type-safe methods
// to query, create, update, and delete rows from every table in the schema.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: DTOs (Data Transfer Objects) define what data is required or optional
// when creating a customer (name, email, phone, etc.).
import { CreateCustomerDto } from './dto/create-customer.dto';

// WHY: PaginationDto carries ?page=&limit=&search= so we can return data in
// small chunks rather than dumping every customer row at once.
import { PaginationDto } from '../../common/dto/pagination.dto';

// WHY: @Injectable() enables NestJS Dependency Injection for this class.
@Injectable()
export class CustomersService {
  // WHY: We declare PrismaService as a constructor parameter. NestJS reads this
  // and automatically provides the shared database client instance.
  // 'private readonly' means we can use it inside this class but not reassign it.
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string, dto: PaginationDto) {
    // WHY: Destructure with defaults — if the caller omits page or limit we use
    // sensible values (page 1, 20 items). Avoids NaN errors in the skip calculation.
    const { page = 1, limit = 20, search } = dto;

    // WHY: Pagination skip formula — "how many rows to jump over before starting".
    // Page 1: skip 0. Page 2: skip 20. Page 3: skip 40. And so on.
    // This is the SQL OFFSET equivalent in Prisma.
    const skip = (page - 1) * limit;

    // WHY: Start the WHERE clause with storeId AND active:true.
    // storeId scopes the query to this store only.
    // active:true hides soft-deleted customers — they exist in the DB but are invisible here.
    const where: any = { storeId, active: true };

    // WHY: Only add the OR search conditions if the caller actually sent a search term.
    // If search is undefined and we didn't check, we'd accidentally filter out all results.
    if (search) {
      // WHY: OR means "match ANY of these conditions" — searching across name, email,
      // AND phone in one query. mode: 'insensitive' = case-insensitive text matching.
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // WHY: Promise.all fires both queries at the same time and waits for both to finish.
    // Running them in parallel cuts wait time roughly in half compared to running sequentially.
    // Query 1: the page of customer rows. Query 2: the total count for pagination math.
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,       // WHY: Jump over rows from previous pages
        take: limit, // WHY: Only return this many rows (the page size)
        orderBy: { createdAt: 'desc' }, // WHY: Newest customers appear first
      }),
      // WHY: count() returns just a number — much cheaper than fetching all rows
      // just to measure how many there are. We need it to compute totalPages.
      this.prisma.customer.count({ where }),
    ]);

    // WHY: Return a standard pagination envelope. The frontend uses totalPages to
    // decide how many page buttons to show, and page to highlight the current one.
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(storeId: string, id: string) {
    // WHY: findFirst with BOTH id AND storeId is a security check.
    // Without storeId, a user from Store A could fetch a customer from Store B
    // just by knowing the UUID. Adding storeId makes that impossible.
    const c = await this.prisma.customer.findFirst({ where: { id, storeId } });

    // WHY: If Prisma returns null (record doesn't exist or belongs to another store),
    // we throw NotFoundException. NestJS catches this and sends a 404 HTTP response.
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async getPurchaseHistory(storeId: string, id: string) {
    // WHY: Call findOne first to verify the customer exists AND belongs to this store.
    // If findOne throws NotFoundException we never reach the orders query below —
    // this prevents leaking order data for invalid customer IDs.
    await this.findOne(storeId, id);

    return this.prisma.order.findMany({
      where: { storeId, customerId: id },

      // WHY: include is like SQL JOIN — fetches related records in the same query.
      // items: true attaches all order line items (what was bought).
      // payment: true attaches the payment record (how they paid, amount, status).
      include: { items: true, payment: true },

      // WHY: Most recent purchases first — this is the standard for purchase history views.
      orderBy: { createdAt: 'desc' },

      // WHY: Limit to 50 orders. Customers could have hundreds of orders; sending
      // all of them at once would be slow. A production app would paginate this too.
      take: 50,
    });
  }

  async create(storeId: string, dto: CreateCustomerDto) {
    // WHY: Spread the DTO fields into the data object alongside storeId.
    // This creates a new customer row with all fields from the DTO plus the store association.
    // Prisma will assign a UUID for the id and fill in createdAt automatically.
    return this.prisma.customer.create({ data: { storeId, ...dto } });
  }

  async update(storeId: string, id: string, dto: Partial<CreateCustomerDto>) {
    // WHY: Verify the customer exists AND belongs to this store before updating.
    // Without this check, a user could update any customer record by guessing an ID.
    await this.findOne(storeId, id);

    // WHY: Only update the fields included in dto — this is a partial update.
    // Prisma's update only changes the fields you list in `data`, leaving others alone.
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(storeId: string, id: string) {
    // WHY: Verify the customer exists in this store before attempting to deactivate it.
    await this.findOne(storeId, id);

    // WHY: This is a SOFT DELETE — we set active = false instead of deleting the row.
    // Why soft delete?
    //   1. Historical orders reference this customer's ID. A hard delete would break those references.
    //   2. We can "undelete" a customer if they return.
    //   3. Regulators sometimes require data retention for financial records.
    // The findAll method filters by active:true so this customer disappears from all
    // listings without losing the data.
    await this.prisma.customer.update({ where: { id }, data: { active: false } });

    // WHY: Return a simple message object so the API caller knows the operation succeeded.
    // We don't return the customer record because it no longer matters in active context.
    return { message: 'Customer deactivated' };
  }

  // WHY: This method is called by OrdersService whenever an order is marked COMPLETED.
  // It lives here (not in OrdersService) because CustomersService owns all customer data logic.
  async updateAfterOrder(storeId: string, customerId: string, orderTotal: number) {
    // WHY: Calculate loyalty points earned. The rule is 1 point per ₹100 spent.
    // Math.floor discards fractional points — a ₹150 order earns 1 point, not 1.5.
    const loyaltyEarned = Math.floor(orderTotal / 100);

    // WHY: Use Prisma's atomic increment operations instead of:
    //   1. Read current values
    //   2. Add to them in JavaScript
    //   3. Write back
    // That pattern has a race condition — if two orders complete at the same instant,
    // one update could overwrite the other. { increment: X } tells the database to
    // add X to the current value in a single atomic operation, preventing data loss.
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: orderTotal },     // WHY: Track lifetime spend for VIP tiers
        totalOrders: { increment: 1 },             // WHY: Track how many orders this customer has made
        loyaltyPoints: { increment: loyaltyEarned }, // WHY: Accumulate points for rewards/discounts
      },
    });
  }
}
