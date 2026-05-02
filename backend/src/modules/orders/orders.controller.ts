import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Role, OrderStatus } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filtering' })
  findAll(
    @StoreId() storeId: string,
    @Query() dto: PaginationDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll(storeId, { ...dto, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.ordersService.findOne(storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(
    @StoreId() storeId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(storeId, user.sub, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update order status (triggers stock deduction on COMPLETED)' })
  updateStatus(
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(storeId, id, dto);
  }
}
