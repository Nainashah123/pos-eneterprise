import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StoreId } from '../../common/decorators/store-id.decorator';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers with pagination' })
  findAll(@StoreId() storeId: string, @Query() dto: PaginationDto) {
    return this.customersService.findAll(storeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.customersService.findOne(storeId, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get customer purchase history' })
  history(@StoreId() storeId: string, @Param('id') id: string) {
    return this.customersService.getPurchaseHistory(storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(@StoreId() storeId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(@StoreId() storeId: string, @Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) {
    return this.customersService.update(storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate customer' })
  remove(@StoreId() storeId: string, @Param('id') id: string) {
    return this.customersService.remove(storeId, id);
  }
}
