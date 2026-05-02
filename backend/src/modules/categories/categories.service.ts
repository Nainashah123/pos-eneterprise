import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(storeId: string) {
    const key = `categories:${storeId}`;
    const cached = await this.redis.get(key);
    if (cached) return cached;

    const data = await this.prisma.category.findMany({
      where: { storeId, active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    await this.redis.set(key, data, 300);
    return data;
  }

  async findOne(storeId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, storeId } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(storeId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { storeId_name: { storeId, name: dto.name } },
    });
    if (existing) throw new ConflictException('Category name already exists');

    const cat = await this.prisma.category.create({ data: { storeId, ...dto } });
    await this.redis.del(`categories:${storeId}`);
    return cat;
  }

  async update(storeId: string, id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(storeId, id);
    const cat = await this.prisma.category.update({ where: { id }, data: dto });
    await this.redis.del(`categories:${storeId}`);
    return cat;
  }

  async remove(storeId: string, id: string) {
    await this.findOne(storeId, id);
    await this.prisma.category.update({ where: { id }, data: { active: false } });
    await this.redis.del(`categories:${storeId}`);
    return { message: 'Category deactivated' };
  }
}
