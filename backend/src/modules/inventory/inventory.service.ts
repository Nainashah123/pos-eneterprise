// WHY: @Injectable marks this class so NestJS can manage it as a singleton provider
// and inject it into other classes (like OrdersService and InventoryController).
// NotFoundException sends HTTP 404; BadRequestException sends HTTP 400.
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

// WHY: PrismaService wraps the Prisma database client and makes it available via
// Dependency Injection instead of creating a new connection every time.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: AdjustStockDto defines the validated shape of a stock adjustment request:
// { quantity: number, type: StockMovementType, note?: string }
import { AdjustStockDto } from './dto/adjust-stock.dto';

// WHY: StockMovementType is a Prisma enum representing why stock changed:
// PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE, etc. Using an enum prevents typos.
import { StockMovementType } from '@prisma/client';

// WHY: @Injectable() enables NestJS to inject this service wherever it's declared
// in a constructor. One instance is shared across the whole application.
@Injectable()
export class InventoryService {
  // WHY: Dependency Injection — we ask NestJS for PrismaService and it provides the
  // single shared instance. No need to manually instantiate it with `new`.
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.inventory.findMany({
      // WHY: Always filter by storeId first so we only return records for this store.
      where: { storeId },

      // WHY: include is Prisma's equivalent of a SQL JOIN.
      // include: { product: { include: { category: true } } } means:
      //   "Fetch each inventory row AND attach the related product row AND
      //    attach the category row nested inside the product."
      // Without this, we'd get inventory numbers but no product name or category —
      // we'd need extra queries to look those up.
      include: { product: { include: { category: true } } },

      // WHY: Sort alphabetically by product name so the list is easy to scan.
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getLowStock(storeId: string) {
    // WHY: We fetch ALL inventory with their products first because Prisma does not
    // support "WHERE column1 <= column2" (comparing two columns) in its findMany API.
    // So we fetch everything and filter in JavaScript instead.
    const items = await this.prisma.inventory.findMany({
      where: { storeId },
      include: { product: true },
    });

    // WHY: .filter() keeps only items where the current quantity has fallen to or
    // below the minimum stock threshold. These are the products that need reordering.
    return items.filter(i => i.quantity <= i.minStock);
  }

  async getMovements(storeId: string, productId?: string) {
    // WHY: Start the WHERE clause with storeId — every query must be store-scoped.
    // We type it as 'any' because we conditionally add more fields to it.
    const where: any = { storeId };

    // WHY: Conditionally add the productId filter. If no productId was passed we
    // return all movements for the store; if one was passed we narrow to that product.
    if (productId) where.productId = productId;

    return this.prisma.stockMovement.findMany({
      where,
      // WHY: include: { product: true } joins the product table so we can show the
      // product name next to each movement record (instead of just the productId UUID).
      include: { product: true },
      // WHY: Newest movements first — audit logs are always read from most recent.
      orderBy: { createdAt: 'desc' },
      // WHY: Limit to 100 rows to avoid sending megabytes of history to the client.
      // A production app would paginate this; 100 is good enough for now.
      take: 100,
    });
  }

  async adjustStock(storeId: string, productId: string, dto: AdjustStockDto) {
    // WHY: Find the specific inventory record for this product in this store.
    // findFirst is used (not findUnique) because our where clause uses two fields.
    const inv = await this.prisma.inventory.findFirst({
      where: { storeId, productId },
    });

    // WHY: If no inventory record exists for this product, we cannot adjust it.
    // Throw 404 rather than silently failing or creating a partial record.
    if (!inv) throw new NotFoundException('Inventory record not found');

    // WHY: Calculate what the new quantity would be.
    // dto.quantity can be negative (e.g. -5 for a manual write-off) or positive (e.g. +50 for a restock).
    const newQty = inv.quantity + dto.quantity;

    // WHY: Stock can never go below zero — you can't have -3 items on a shelf.
    // Reject the adjustment before touching the database.
    if (newQty < 0) throw new BadRequestException('Insufficient stock');

    // WHY: $transaction([...]) runs both database operations together atomically.
    // If the inventory update succeeds but the stockMovement insert fails (or vice versa),
    // the whole thing is rolled back — we never have an inventory change without a matching
    // audit log entry, or an audit log entry without the matching inventory change.
    const [updated] = await this.prisma.$transaction([
      // WHY: Update the inventory quantity to the new calculated value.
      // We also include the product in the return so the caller gets the full record.
      this.prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: newQty },
        include: { product: true },
      }),

      // WHY: Create a StockMovement record as an immutable audit log entry.
      // This is how managers can see "who changed stock, by how much, and why".
      this.prisma.stockMovement.create({
        data: {
          storeId,
          productId,
          type: dto.type,         // WHY: e.g. PURCHASE, ADJUSTMENT, DAMAGE — the reason for the change
          quantity: dto.quantity, // WHY: The signed delta, e.g. +50 or -3
          note: dto.note,         // WHY: Optional free-text note from the manager, e.g. "Damaged in transit"
        },
      }),
    ]);

    // WHY: We only return `updated` (the inventory record). The stockMovement record
    // is created but not returned — the caller doesn't need it immediately.
    return updated;
  }

  // WHY: This method is called by OrdersService when an order is COMPLETED.
  // It deducts stock for every item in the order, one item at a time.
  // It lives here (not in OrdersService) because InventoryService owns all stock logic.
  async deductStockForOrder(storeId: string, orderId: string) {
    // WHY: Fetch all line items for this order so we know what products to deduct.
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });

    // WHY: Loop over each item and call adjustStock with a NEGATIVE quantity.
    // A sale reduces stock, so quantity is `-item.quantity` (e.g. -2 for 2 units sold).
    for (const item of items) {
      await this.adjustStock(storeId, item.productId, {
        quantity: -item.quantity,          // WHY: Negative = removing stock
        type: StockMovementType.SALE,      // WHY: SALE type marks this as a sale-driven deduction
        note: `Order deduction`,           // WHY: Audit note so managers know the movement came from an order
      });
    }
  }
}
