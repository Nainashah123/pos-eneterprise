// WHY: @Injectable() marks this class so NestJS knows it can be injected as a dependency into controllers or other services.
// WHY: NotFoundException throws a 404 when a product isn't found. ConflictException throws a 409 when a product with the same SKU already exists.
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

// WHY: PrismaService is our database client — it provides type-safe methods to query and modify the PostgreSQL database.
import { PrismaService } from '../../prisma/prisma.service';

// WHY: RedisService is our cache client — we use it to invalidate cached product lists when data changes, so the frontend always gets fresh data.
import { RedisService } from '../../redis/redis.service';

// WHY: CreateProductDto is a Data Transfer Object — it defines and validates the exact fields required to create a new product.
import { CreateProductDto } from './dto/create-product.dto';

// WHY: PaginationDto defines query parameters like page, limit, and search — used to return results in pages instead of all at once.
import { PaginationDto } from '../../common/dto/pagination.dto';

// WHY: @Injectable() registers this class with NestJS's dependency injection container so it can be automatically provided wherever it's needed.
@Injectable()
export class ProductsService {
  // WHY: NestJS injects PrismaService and RedisService automatically — we declare them here and NestJS handles creating/sharing the instances.
  constructor(
    private readonly prisma: PrismaService,  // WHY: used for all database operations (find, create, update, delete products).
    private readonly redis: RedisService,    // WHY: used to clear cached product lists so they don't return stale data after changes.
  ) {}

  // WHY: async because all Prisma database calls are asynchronous — they communicate with a remote database and we must await the result.
  async findAll(storeId: string, dto: PaginationDto) {
    // WHY: Destructure the DTO with defaults — if page or limit aren't provided, use sensible values (page 1, 20 items per page).
    const { page = 1, limit = 20, search } = dto;

    // WHY: "skip" calculates how many records to skip for pagination — e.g. page 3 with limit 20 means skip the first 40 records.
    const skip = (page - 1) * limit;

    // WHY: "where" is the Prisma filter object — we always scope by storeId so users only see their own store's products, and active: true excludes soft-deleted products.
    const where: any = { storeId, active: true };

    // WHY: If a search term is provided, add an OR condition that checks if the name, SKU, or barcode contains the search string.
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },     // WHY: mode: 'insensitive' makes the search case-insensitive so "apple" matches "Apple".
        { sku: { contains: search, mode: 'insensitive' } },      // WHY: lets cashiers search by product code (e.g. "PRD-001").
        { barcode: { contains: search, mode: 'insensitive' } },  // WHY: lets cashiers scan or type a barcode to find a product.
      ];
    }

    // WHY: Promise.all() runs both database queries at the same time — fetching the page of data AND the total count simultaneously is faster than doing them sequentially.
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,        // WHY: skip the records from previous pages.
        take: limit, // WHY: "take" is Prisma's way of saying "return at most this many records" — equivalent to SQL LIMIT.
        // WHY: include fetches related records in the same query — category gives us the product's category object, inventory gives stock levels.
        include: { category: true, inventory: true },
        orderBy: { name: 'asc' }, // WHY: sort alphabetically by name so the product list is predictable and easy to scan.
      }),
      // WHY: product.count() returns just the total number of matching records — needed to calculate total pages on the frontend.
      this.prisma.product.count({ where }),
    ]);

    // WHY: Return pagination metadata alongside the data so the frontend knows how many pages exist and which page it's on.
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }; // WHY: Math.ceil rounds up — 21 items with limit 20 = 2 pages, not 1.
  }

  async findOne(storeId: string, id: string) {
    // WHY: findFirst with both id AND storeId ensures a user from Store A can't access a product that belongs to Store B — security by design.
    const p = await this.prisma.product.findFirst({
      where: { id, storeId },
      include: { category: true, inventory: true }, // WHY: include related data so the response has category name and stock level in one query.
    });
    // WHY: Throw 404 if no product is found — this could be because the product doesn't exist, or it belongs to a different store.
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async findBySku(storeId: string, sku: string) {
    // WHY: findUnique is used here because storeId_sku is a composite unique index in the database — there's guaranteed to be at most one match.
    const p = await this.prisma.product.findUnique({
      where: { storeId_sku: { storeId, sku } }, // WHY: Prisma composite unique key syntax — scope the SKU lookup to this store only.
      include: { category: true, inventory: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async findByBarcode(storeId: string, barcode: string) {
    // WHY: findFirst is used because barcode doesn't have a unique constraint — if somehow duplicates exist, we return the first match.
    const p = await this.prisma.product.findFirst({
      where: { storeId, barcode }, // WHY: always include storeId to prevent cross-store data leakage.
      include: { category: true, inventory: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(storeId: string, dto: CreateProductDto) {
    // WHY: Check for an existing product with the same SKU in this store before inserting — SKUs must be unique per store.
    const existing = await this.prisma.product.findUnique({
      where: { storeId_sku: { storeId, sku: dto.sku } },
    });
    // WHY: Throw 409 Conflict if the SKU is taken — prevents silent duplicate creation.
    if (existing) throw new ConflictException('SKU already exists');

    // WHY: Destructure initialStock and minStock out of the DTO — these are inventory fields, not product fields, so they go into a nested create.
    const { initialStock = 0, minStock = 5, ...productData } = dto; // WHY: defaults of 0 and 5 are applied if the client doesn't provide them.

    // WHY: prisma.product.create() with a nested inventory.create inserts both the product row and its inventory row in a single atomic database transaction.
    const product = await this.prisma.product.create({
      data: {
        storeId,
        ...productData,  // WHY: spread operator copies all product fields (name, price, sku, etc.) from the DTO into the data object.
        inventory: {
          // WHY: Prisma's nested "create" creates a related inventory record linked to this product in the same operation — no separate query needed.
          create: { storeId, quantity: initialStock, minStock },
        },
      },
      include: { category: true, inventory: true }, // WHY: return the full product with its relations in the response.
    });

    // WHY: After creating a product, delete all cached product list results for this store — the cache is stale now because there's a new product.
    await this.redis.delByPattern(`products:${storeId}:*`);
    return product;
  }

  // WHY: Partial<CreateProductDto> means all fields are optional — for an update, the client only needs to send the fields they want to change.
  async update(storeId: string, id: string, dto: Partial<CreateProductDto>) {
    // WHY: Call findOne first to verify the product exists AND belongs to this store — prevents updating a product from another store.
    await this.findOne(storeId, id);

    // WHY: Remove initialStock and minStock from the update data — inventory updates go through the separate /inventory endpoint, not here.
    const { initialStock, minStock, ...productData } = dto as any;

    const product = await this.prisma.product.update({
      where: { id }, // WHY: update by ID since we've already verified it belongs to the correct store above.
      data: productData,
      include: { category: true, inventory: true },
    });

    // WHY: Bust the cache again after an update — any cached product lists are now stale.
    await this.redis.delByPattern(`products:${storeId}:*`);
    return product;
  }

  async remove(storeId: string, id: string) {
    // WHY: Verify the product exists and belongs to this store before attempting to remove it.
    await this.findOne(storeId, id);

    // WHY: We set active: false instead of deleting the row — this is called "soft delete". It preserves the product in past orders and keeps historical data intact.
    await this.prisma.product.update({ where: { id }, data: { active: false } });

    // WHY: Bust the cache so the deactivated product no longer appears in product lists.
    await this.redis.delByPattern(`products:${storeId}:*`);
    return { message: 'Product deactivated' };
  }
}
