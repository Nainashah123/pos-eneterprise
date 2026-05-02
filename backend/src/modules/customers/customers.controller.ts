// WHY: We import the HTTP method decorators we need.
// @Delete maps a method to an HTTP DELETE request — used for removing/deactivating resources.
// @Patch maps to HTTP PATCH — used for partial updates (change a few fields, not the whole record).
// Every decorator here maps a TypeScript method to a specific HTTP verb + URL.
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';

// WHY: Swagger decorators enrich the API documentation page.
// @ApiTags groups routes; @ApiBearerAuth adds the lock icon; @ApiOperation adds a description.
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

// WHY: The service contains all the database logic. The controller only handles
// the HTTP layer (reading params, delegating to service, returning the result).
import { CustomersService } from './customers.service';

// WHY: CreateCustomerDto defines the required shape of the request body when creating
// a customer — e.g. name, email, phone. NestJS validates it automatically.
import { CreateCustomerDto } from './dto/create-customer.dto';

// WHY: PaginationDto captures ?page=&limit=&search= query params for list endpoints.
// Returning pages of data instead of the whole table is called pagination.
import { PaginationDto } from '../../common/dto/pagination.dto';

// WHY: JwtAuthGuard ensures the request has a valid Bearer token in the Authorization header.
// Any request without a valid token gets a 401 Unauthorized response immediately.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: RolesGuard reads the @Roles() metadata on each route and blocks users
// whose role does not match. It only runs after JwtAuthGuard confirms the token.
import { RolesGuard } from '../../common/guards/roles.guard';

// WHY: @StoreId() is a custom parameter decorator that reads the storeId claim from
// the decoded JWT. We never trust a storeId sent in the request body or URL.
import { StoreId } from '../../common/decorators/store-id.decorator';

// WHY: @ApiTags('customers') creates a "customers" section in the Swagger docs page,
// keeping all customer endpoints grouped together visually.
@ApiTags('customers')

// WHY: Tells Swagger that all routes here require an Authorization: Bearer <token> header.
@ApiBearerAuth('access-token')

// WHY: Both guards run on every route in this controller:
// 1. JwtAuthGuard verifies the token is valid and not expired.
// 2. RolesGuard checks the user's role against any @Roles() decorators.
@UseGuards(JwtAuthGuard, RolesGuard)

// WHY: @Controller('customers') sets the URL prefix. All routes here live under /api/v1/customers.
@Controller('customers')
export class CustomersController {
  // WHY: Dependency Injection — NestJS creates a single CustomersService instance
  // and passes it here. We don't call `new CustomersService()` ourselves.
  constructor(private readonly customersService: CustomersService) {}

  // WHY: @Get() maps to GET /api/v1/customers — fetches a paginated list of customers.
  // Pagination is important because a store can have thousands of customers; sending
  // them all at once would be slow and memory-intensive.
  @Get()
  @ApiOperation({ summary: 'List customers with pagination' })
  findAll(
    @StoreId() storeId: string,

    // WHY: @Query() maps all query string parameters (?page=&limit=&search=) into
    // the PaginationDto object. NestJS validates the shape automatically.
    @Query() dto: PaginationDto,
  ) {
    return this.customersService.findAll(storeId, dto);
  }

  // WHY: @Get(':id') maps to GET /api/v1/customers/:id — fetches ONE customer by ID.
  // The :id is a URL variable — e.g. /customers/abc-123 → id = "abc-123".
  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(
    @StoreId() storeId: string,

    // WHY: @Param('id') extracts the :id segment from the URL path.
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(storeId, id);
  }

  // WHY: @Get(':id/history') maps to GET /api/v1/customers/:id/history
  // This is a sub-resource route — the purchase history belongs to a specific customer.
  @Get(':id/history')
  @ApiOperation({ summary: 'Get customer purchase history' })
  history(
    @StoreId() storeId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getPurchaseHistory(storeId, id);
  }

  // WHY: @Post() maps to POST /api/v1/customers — creates a new customer record.
  // POST is used for creation; the new resource's ID is assigned by the database.
  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(
    @StoreId() storeId: string,

    // WHY: @Body() deserializes the JSON request body into CreateCustomerDto.
    // If validation fails (e.g. email format is wrong), NestJS returns 400 automatically.
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(storeId, dto);
  }

  // WHY: @Patch(':id') maps to PATCH /api/v1/customers/:id — partial update.
  // PATCH means "only change the fields I send" (unlike PUT which replaces the whole record).
  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @StoreId() storeId: string,
    @Param('id') id: string,

    // WHY: Partial<CreateCustomerDto> means all fields are optional.
    // The client can send just { phone: "9876543210" } to update only the phone number.
    @Body() dto: Partial<CreateCustomerDto>,
  ) {
    return this.customersService.update(storeId, id, dto);
  }

  // WHY: @Delete(':id') maps to DELETE /api/v1/customers/:id
  // Despite being called "remove", this does NOT delete the database row.
  // It performs a "soft delete" — sets active = false — so the record is preserved
  // for historical order data while the customer no longer appears in active listings.
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate customer' })
  remove(
    @StoreId() storeId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(storeId, id);
  }
}
