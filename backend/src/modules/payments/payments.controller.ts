import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all payments' })
  findAll(@StoreId() storeId: string) { return this.paymentsService.findAll(storeId); }

  @Get('summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Payment summary & method breakdown' })
  summary(@StoreId() storeId: string) { return this.paymentsService.getSummary(storeId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(storeId, id);
  }

  @Post('order/:orderId/process')
  @ApiOperation({ summary: 'Process payment for an order' })
  process(
    @StoreId() storeId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processForOrder(storeId, orderId, dto);
  }

  @Patch(':id/refund')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Refund a payment' })
  refund(@StoreId() storeId: string, @Param('id') id: string) {
    return this.paymentsService.refund(storeId, id);
  }
}
