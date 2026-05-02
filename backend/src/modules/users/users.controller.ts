import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all users in the store' })
  findAll(@StoreId() storeId: string) { return this.usersService.findAll(storeId); }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@StoreId() storeId: string, @Param('id') id: string) {
    return this.usersService.findOne(storeId, id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  create(@StoreId() storeId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(storeId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  update(@StoreId() storeId: string, @Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
    return this.usersService.update(storeId, id, dto);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle user active status' })
  toggle(@StoreId() storeId: string, @Param('id') id: string) {
    return this.usersService.toggleActive(storeId, id);
  }
}
