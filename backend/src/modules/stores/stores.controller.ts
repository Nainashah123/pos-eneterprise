import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('stores')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all stores' })
  findAll() { return this.storesService.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a store by ID' })
  findOne(@Param('id') id: string) { return this.storesService.findOne(id); }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new store' })
  create(@Body() dto: CreateStoreDto) { return this.storesService.create(dto); }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update store details' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateStoreDto>) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a store' })
  remove(@Param('id') id: string) { return this.storesService.remove(id); }
}
