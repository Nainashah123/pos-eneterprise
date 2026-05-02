import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(storeId: string, dto: PaginationDto) {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    const where: any = { storeId, active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, inventory: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(storeId: string, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, storeId },
      include: { category: true, inventory: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async findBySku(storeId: string, sku: string) {
    const p = await this.prisma.product.findUnique({
      where: { storeId_sku: { storeId, sku } },
      include: { category: true, inventory: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async findByBarcode(storeId: string, barcode: string) {
    const p = await this.prisma.product.findFirst({
      where: { storeId, barcode },
      include: { category: true, inventory: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(storeId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { storeId_sku: { storeId, sku: dto.sku } },
    });
    if (existing) throw new ConflictException('SKU already exists');

    const { initialStock = 0, minStock = 5, ...productData } = dto;

    const product = await this.prisma.product.create({
      data: {
        storeId,
        ...productData,
        inventory: {
          create: { storeId, quantity: initialStock, minStock },
        },
      },
      include: { category: true, inventory: true },
    });

    await this.redis.delByPattern(`products:${storeId}:*`);
    return product;
  }

  async update(storeId: string, id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(storeId, id);
    const { initialStock, minStock, ...productData } = dto as any;
    const product = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true, inventory: true },
    });
    await this.redis.delByPattern(`products:${storeId}:*`);
    return product;
  }

  async remove(storeId: string, id: string) {
    await this.findOne(storeId, id);
    await this.prisma.product.update({ where: { id }, data: { active: false } });
    await this.redis.delByPattern(`products:${storeId}:*`);
    return { message: 'Product deactivated' };
  }
}
