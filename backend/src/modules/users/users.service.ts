import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.user.findMany({
      where: { storeId },
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(storeId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, storeId },
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(storeId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { storeId_email: { storeId, email: dto.email } },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { storeId, ...dto, password: hashed, role: dto.role || Role.CASHIER },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async update(storeId: string, id: string, dto: Partial<CreateUserDto>) {
    await this.findOne(storeId, id);
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    });
  }

  async toggleActive(storeId: string, id: string) {
    const user = await this.findOne(storeId, id);
    return this.prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: { id: true, active: true },
    });
  }
}
