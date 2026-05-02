import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with pagination and search' })
  findAll(@StoreId() storeId: string, @Query() dto: PaginationDto) {
    return this.productsService.findAll(storeId, dto);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode (for scanner)' })
  findByBarcode(@StoreId() storeId: string, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(storeId, barcode);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Find product by SKU' })
  findBySku(@StoreId() storeId: string, @Param('sku') sku: string) {
    return this.productsService.findBySku(storeId, sku);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.productsService.findOne(storeId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create product with initial inventory' })
  create(@StoreId() storeId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(storeId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update product' })
  update(@StoreId() storeId: string, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Deactivate product' })
  remove(@StoreId() storeId: string, @Param('id') id: string) {
    return this.productsService.remove(storeId, id);
  }
}
