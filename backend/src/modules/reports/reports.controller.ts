// WHY: We import only the decorators this controller needs.
//   - Controller → marks this class as an HTTP route handler
//   - Get        → maps a method to HTTP GET requests
//   - Query      → reads query-string parameters from the URL (e.g. ?from=2024-01-01)
//   - UseGuards  → attaches security guards that run before any handler
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

// WHY: Swagger decorators auto-generate interactive API documentation.
//   Visit http://localhost:3001/api/docs to see the result.
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

// WHY: ReportsService contains all the heavy database aggregation logic.
//   The controller only handles HTTP routing and delegates work to the service.
import { ReportsService } from './reports.service';

// WHY: DateRangeDto defines the optional `from` and `to` query parameters
//   for the daily sales endpoint. NestJS validates them automatically.
import { DateRangeDto } from './dto/date-range.dto';

// WHY: JwtAuthGuard ensures only logged-in users (valid Bearer token) can call these routes.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: RolesGuard reads the @Roles() metadata and blocks users whose role
//   doesn't appear in the allowed list.
import { RolesGuard } from '../../common/guards/roles.guard';

// WHY: @Roles() sets the list of allowed roles for a route or entire controller.
import { Roles } from '../../common/decorators/roles.decorator';

// WHY: @StoreId() extracts the storeId from the verified JWT payload.
//   Reports are store-scoped — one store's data must never appear in another store's reports.
import { StoreId } from '../../common/decorators/store-id.decorator';

// WHY: Role is the Prisma-generated enum: Role.ADMIN, Role.MANAGER, Role.CASHIER.
import { Role } from '@prisma/client';

// WHY: Groups all these routes under "reports" in the Swagger UI sidebar.
@ApiTags('reports')

// WHY: All routes here require a Bearer token, so we declare it once at class level.
@ApiBearerAuth('access-token')

// WHY: Apply both guards to every route in this controller at once.
@UseGuards(JwtAuthGuard, RolesGuard)

// WHY: This @Roles() is placed at the CLASS level, which means it applies to
//   ALL routes in this controller automatically. Only ADMIN and MANAGER can
//   access any reports endpoint. Cashiers see no financial reports.
@Roles(Role.ADMIN, Role.MANAGER)

// WHY: @Controller('reports') makes all routes start with /api/v1/reports.
@Controller('reports')
export class ReportsController {

  // WHY: Dependency injection — NestJS creates and provides ReportsService for us.
  constructor(private readonly reportsService: ReportsService) {}

  // WHY: GET /api/v1/reports/kpis — returns today's key performance indicators
  //   compared to yesterday. KPIs = things like total revenue, number of orders, etc.
  @Get('kpis')
  @ApiOperation({ summary: 'Today vs yesterday KPI summary' })
  // WHY: No query params needed — the service always computes "today vs yesterday"
  //   based on the current server time. Simple route, no extra inputs required.
  getKpis(@StoreId() storeId: string) { return this.reportsService.getDashboardKpis(storeId); }

  // WHY: GET /api/v1/reports/daily-sales?from=2024-01-01&to=2024-01-31
  //   Returns total revenue and order count for each day in the date range.
  @Get('daily-sales')
  @ApiOperation({ summary: 'Daily sales over a date range' })
  // WHY: @Query() maps the entire query string (?from=...&to=...) to DateRangeDto.
  //   Both `from` and `to` are optional — the service defaults to the last 30 days.
  getDailySales(@StoreId() storeId: string, @Query() dto: DateRangeDto) {
    return this.reportsService.getDailySales(storeId, dto);
  }

  // WHY: GET /api/v1/reports/monthly-revenue — bar chart data for the past 12 months.
  //   No date parameters needed; the service always looks back exactly 12 months.
  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Monthly revenue - past 12 months' })
  getMonthlyRevenue(@StoreId() storeId: string) {
    return this.reportsService.getMonthlyRevenue(storeId);
  }

  // WHY: GET /api/v1/reports/top-products?limit=5
  //   Returns the best-selling products by revenue over the last 30 days.
  @Get('top-products')
  @ApiOperation({ summary: 'Top products by revenue (last 30 days)' })
  // WHY: `@Query('limit')` reads just the single `limit` query parameter.
  //   It arrives as a string (all query params are strings), so `Number(limit)` converts it.
  //   If `limit` is not provided, we fall back to 10 as the default.
  getTopProducts(@StoreId() storeId: string, @Query('limit') limit?: number) {
    return this.reportsService.getTopProducts(storeId, limit ? Number(limit) : 10);
  }

  // WHY: GET /api/v1/reports/by-category — pie/donut chart data showing how much
  //   revenue each product category generated in the last 30 days.
  @Get('by-category')
  @ApiOperation({ summary: 'Sales by category (last 30 days)' })
  getSalesByCategory(@StoreId() storeId: string) {
    return this.reportsService.getSalesByCategory(storeId);
  }
}
