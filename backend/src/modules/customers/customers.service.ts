import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string, dto: PaginationDto) {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    const where: any = { storeId, active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(storeId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, storeId } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async getPurchaseHistory(storeId: string, id: string) {
    await this.findOne(storeId, id);
    return this.prisma.order.findMany({
      where: { storeId, customerId: id },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(storeId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { storeId, ...dto } });
  }

  async update(storeId: string, id: string, dto: Partial<CreateCustomerDto>) {
    await this.findOne(storeId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(storeId: string, id: string) {
    await this.findOne(storeId, id);
    await this.prisma.customer.update({ where: { id }, data: { active: false } });
    return { message: 'Customer deactivated' };
  }

  async updateAfterOrder(storeId: string, customerId: string, orderTotal: number) {
    const loyaltyEarned = Math.floor(orderTotal / 100); // 1 point per ₹100
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: orderTotal },
        totalOrders: { increment: 1 },
        loyaltyPoints: { increment: loyaltyEarned },
      },
    });
  }
}
