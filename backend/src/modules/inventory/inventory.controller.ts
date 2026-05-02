import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get full inventory' })
  findAll(@StoreId() storeId: string) { return this.inventoryService.findAll(storeId); }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low/out-of-stock items' })
  getLowStock(@StoreId() storeId: string) { return this.inventoryService.getLowStock(storeId); }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  getMovements(@StoreId() storeId: string, @Query('productId') productId?: string) {
    return this.inventoryService.getMovements(storeId, productId);
  }

  @Post(':productId/adjust')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Adjust stock for a product' })
  adjust(
    @StoreId() storeId: string,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(storeId, productId, dto);
  }
}
