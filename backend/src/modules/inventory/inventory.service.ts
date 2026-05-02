import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.inventory.findMany({
      where: { storeId },
      include: { product: { include: { category: true } } },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getLowStock(storeId: string) {
    const items = await this.prisma.inventory.findMany({
      where: { storeId },
      include: { product: true },
    });
    return items.filter(i => i.quantity <= i.minStock);
  }

  async getMovements(storeId: string, productId?: string) {
    const where: any = { storeId };
    if (productId) where.productId = productId;
    return this.prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async adjustStock(storeId: string, productId: string, dto: AdjustStockDto) {
    const inv = await this.prisma.inventory.findFirst({
      where: { storeId, productId },
    });
    if (!inv) throw new NotFoundException('Inventory record not found');

    const newQty = inv.quantity + dto.quantity;
    if (newQty < 0) throw new BadRequestException('Insufficient stock');

    const [updated] = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: newQty },
        include: { product: true },
      }),
      this.prisma.stockMovement.create({
        data: {
          storeId,
          productId,
          type: dto.type,
          quantity: dto.quantity,
          note: dto.note,
        },
      }),
    ]);

    return updated;
  }

  async deductStockForOrder(storeId: string, orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });

    for (const item of items) {
      await this.adjustStock(storeId, item.productId, {
        quantity: -item.quantity,
        type: StockMovementType.SALE,
        note: `Order deduction`,
      });
    }
  }
}
