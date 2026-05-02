import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto/date-range.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Today vs yesterday KPI summary' })
  getKpis(@StoreId() storeId: string) { return this.reportsService.getDashboardKpis(storeId); }

  @Get('daily-sales')
  @ApiOperation({ summary: 'Daily sales over a date range' })
  getDailySales(@StoreId() storeId: string, @Query() dto: DateRangeDto) {
    return this.reportsService.getDailySales(storeId, dto);
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Monthly revenue - past 12 months' })
  getMonthlyRevenue(@StoreId() storeId: string) {
    return this.reportsService.getMonthlyRevenue(storeId);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products by revenue (last 30 days)' })
  getTopProducts(@StoreId() storeId: string, @Query('limit') limit?: number) {
    return this.reportsService.getTopProducts(storeId, limit ? Number(limit) : 10);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Sales by category (last 30 days)' })
  getSalesByCategory(@StoreId() storeId: string) {
    return this.reportsService.getSalesByCategory(storeId);
  }
}
