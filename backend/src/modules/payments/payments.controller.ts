// WHY: Import the decorators this controller uses:
//   - Controller → marks this class as an HTTP route handler
//   - Get/Post/Patch → map methods to their HTTP verbs
//   - Body    → extracts the JSON request body
//   - Param   → extracts a value from the URL path (e.g. /payments/:id → id)
//   - UseGuards → attaches security middleware (runs before the handler)
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';

// WHY: Swagger decorators build the interactive API documentation page automatically.
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

// WHY: PaymentsService contains all the database logic for payments.
//   The controller only handles HTTP — it delegates the real work to the service.
import { PaymentsService } from './payments.service';

// WHY: ProcessPaymentDto validates the body sent when processing a payment.
//   It ensures fields like `method` and `cashGiven` are the right types.
import { ProcessPaymentDto } from './dto/process-payment.dto';

// WHY: JwtAuthGuard ensures only logged-in users can access payment endpoints.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: RolesGuard reads the @Roles() metadata and blocks users whose role
//   doesn't match the allowed list (only used on admin/manager routes here).
import { RolesGuard } from '../../common/guards/roles.guard';

// WHY: @Roles() sets which roles are allowed to call a specific route.
import { Roles } from '../../common/decorators/roles.decorator';

// WHY: @StoreId() reads the storeId from the verified JWT — never from the request body.
//   Payment data must be store-scoped so Store A can't see Store B's payments.
import { StoreId } from '../../common/decorators/store-id.decorator';

// WHY: Role is the Prisma enum for user roles: ADMIN, MANAGER, CASHIER.
import { Role } from '@prisma/client';

// WHY: Groups all payment routes under "payments" in the Swagger docs sidebar.
@ApiTags('payments')

// WHY: All payment routes require a Bearer token — declared once at class level.
@ApiBearerAuth('access-token')

// WHY: Apply JwtAuthGuard AND RolesGuard to every route in this controller.
//   Individual routes can then add @Roles() to further restrict who can call them.
@UseGuards(JwtAuthGuard, RolesGuard)

// WHY: @Controller('payments') makes all routes start with /api/v1/payments.
@Controller('payments')
export class PaymentsController {

  // WHY: NestJS injects PaymentsService automatically via dependency injection.
  constructor(private readonly paymentsService: PaymentsService) {}

  // WHY: GET /api/v1/payments — returns the most recent payments for this store.
  @Get()
  // WHY: Only ADMIN and MANAGER can see the full payment list.
  //   A cashier processes payments but shouldn't see the store's full payment history.
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all payments' })
  findAll(@StoreId() storeId: string) { return this.paymentsService.findAll(storeId); }

  // WHY: GET /api/v1/payments/summary — returns aggregated totals and breakdown by method.
  //   This is the "how much did we collect today / in total, and via which method?" endpoint.
  //   NOTE: This route must be declared BEFORE /payments/:id below.
  //   If :id came first, NestJS would interpret "summary" as an id value and look up
  //   a payment with id = "summary", which would fail. Order of @Get() declarations matters!
  @Get('summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Payment summary & method breakdown' })
  summary(@StoreId() storeId: string) { return this.paymentsService.getSummary(storeId); }

  // WHY: GET /api/v1/payments/:id — get a single payment record by its ID.
  //   No @Roles decorator here — any authenticated user (including CASHIER) can look up
  //   a specific payment. A cashier may need to verify a payment they just processed.
  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  // WHY: @Param('id') reads the :id from the URL path.
  //   e.g. GET /payments/abc-123 → id = "abc-123"
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(storeId, id);
  }

  // WHY: POST /api/v1/payments/order/:orderId/process
  //   When a customer checks out, the order is created first (via the orders module),
  //   then this endpoint is called to "settle" the payment — record the method (CASH/CARD/UPI)
  //   and mark it as SUCCESS. This two-step process allows for "pending payment" states.
  @Post('order/:orderId/process')
  @ApiOperation({ summary: 'Process payment for an order' })
  // WHY: No @Roles here — a CASHIER at the register should be able to process payments.
  process(
    @StoreId() storeId: string,
    // WHY: @Param('orderId') reads the order's UUID from the URL path.
    @Param('orderId') orderId: string,
    // WHY: @Body() extracts the payment details (method, cashGiven, reference) from the JSON body.
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processForOrder(storeId, orderId, dto);
  }

  // WHY: PATCH /api/v1/payments/:id/refund — marks a payment as REFUNDED.
  //   PATCH (not DELETE) because we keep the record — we just change its status.
  //   Financial records should never be deleted, only marked with their final state.
  @Patch(':id/refund')
  // WHY: Only ADMIN and MANAGER can authorize refunds — cashiers cannot give refunds
  //   on their own without manager approval.
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Refund a payment' })
  refund(@StoreId() storeId: string, @Param('id') id: string) {
    return this.paymentsService.refund(storeId, id);
  }
}
