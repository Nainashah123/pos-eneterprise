// WHY: We import NestJS HTTP decorators.
// @Get, @Post map methods to HTTP verbs.
// @Body extracts the JSON request body.
// @Param extracts a URL segment like :productId.
// @Query extracts query string parameters like ?productId=.
// @UseGuards attaches security guards to the whole controller or a single route.
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';

// WHY: Swagger decorators add this controller to the auto-generated API documentation
// at http://localhost:3001/api/docs — great for manual testing without a frontend.
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

// WHY: The service holds all the real logic. The controller only wires HTTP routes
// to service methods — it should contain no business logic itself.
import { InventoryService } from './inventory.service';

// WHY: AdjustStockDto defines exactly what JSON the client must send when adjusting stock —
// quantity (positive or negative number), movement type, and an optional note.
import { AdjustStockDto } from './dto/adjust-stock.dto';

// WHY: JwtAuthGuard rejects any request that doesn't carry a valid Bearer token.
// Without this guard, anyone on the internet could read or change your inventory.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: RolesGuard checks the role field inside the decoded JWT and enforces @Roles().
// It runs AFTER JwtAuthGuard confirms the token is valid.
import { RolesGuard } from '../../common/guards/roles.guard';

// WHY: @Roles() is a custom decorator that attaches metadata to a route telling
// RolesGuard which roles are allowed. Non-matching roles receive 403 Forbidden.
import { Roles } from '../../common/decorators/roles.decorator';

// WHY: @StoreId() is a custom parameter decorator that extracts the storeId from
// the verified JWT payload — so the storeId is never trusted from the URL or body.
import { StoreId } from '../../common/decorators/store-id.decorator';

// WHY: Role is a Prisma-generated enum matching the "Role" column in the database.
// Using the enum prevents typos — Role.ADMIN is always correct; "ADIMN" would compile.
import { Role } from '@prisma/client';

// WHY: @ApiTags groups all inventory routes under an "inventory" section in Swagger docs.
@ApiTags('inventory')

// WHY: @ApiBearerAuth tells Swagger to include the Authorization header when testing routes.
@ApiBearerAuth('access-token')

// WHY: Both guards apply to EVERY route in this controller — no route is publicly accessible.
@UseGuards(JwtAuthGuard, RolesGuard)

// WHY: @Controller('inventory') sets the base URL prefix for all routes in this class.
// Combined with the global /api/v1 prefix, routes resolve to /api/v1/inventory/...
@Controller('inventory')
export class InventoryController {
  // WHY: Dependency Injection — NestJS provides a single shared InventoryService instance.
  // We declare it as a constructor parameter and NestJS wires it up automatically.
  constructor(private readonly inventoryService: InventoryService) {}

  // WHY: @Get() with no path maps to GET /api/v1/inventory — returns ALL inventory records
  // for this store, each with its product details attached.
  @Get()
  @ApiOperation({ summary: 'Get full inventory' })
  findAll(
    // WHY: @StoreId() reads the storeId from the JWT, not from the URL.
    // This means a cashier logged into Store A cannot request Store B's inventory.
    @StoreId() storeId: string,
  ) {
    return this.inventoryService.findAll(storeId);
  }

  // WHY: @Get('low-stock') maps to GET /api/v1/inventory/low-stock
  // IMPORTANT: This route must appear BEFORE @Get(':productId/...')  because NestJS
  // matches routes top-to-bottom — if a param route came first, "low-stock" would
  // be treated as a productId instead of this dedicated path.
  @Get('low-stock')
  @ApiOperation({ summary: 'Get low/out-of-stock items' })
  getLowStock(
    @StoreId() storeId: string,
  ) {
    // WHY: Delegates to the service which filters inventory records where
    // quantity <= minStock. Used by the dashboard to show alert badges.
    return this.inventoryService.getLowStock(storeId);
  }

  // WHY: @Get('movements') maps to GET /api/v1/inventory/movements
  // Stock movements are an audit log — every time stock increases or decreases,
  // a record is written so managers can trace shrinkage and errors.
  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  getMovements(
    @StoreId() storeId: string,

    // WHY: @Query('productId') is optional (note the ? in the type).
    // If provided, the response is filtered to movements for a single product.
    // If omitted, all movements for the store are returned.
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getMovements(storeId, productId);
  }

  // WHY: @Post(':productId/adjust') maps to POST /api/v1/inventory/:productId/adjust
  // We use POST (not PATCH) because this creates a new StockMovement record as a side effect.
  @Post(':productId/adjust')

  // WHY: Only ADMIN and MANAGER can adjust stock manually. A cashier should not be
  // able to add inventory or write off shrinkage — that requires manager approval.
  @Roles(Role.ADMIN, Role.MANAGER)

  @ApiOperation({ summary: 'Adjust stock for a product' })
  adjust(
    @StoreId() storeId: string,

    // WHY: @Param('productId') extracts the product's UUID from the URL path.
    // The colon in ':productId' makes it a dynamic segment.
    @Param('productId') productId: string,

    // WHY: @Body() deserializes the request JSON into AdjustStockDto.
    // NestJS validates it — e.g. if quantity is missing, it rejects with 400 automatically.
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(storeId, productId, dto);
  }
}
