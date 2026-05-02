import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatus, PaymentStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly gateway: OrdersGateway,
  ) {}

  async findAll(storeId: string, dto: PaginationDto & { status?: OrderStatus }) {
    const { page = 1, limit = 20, search, status } = dto;
    const skip = (page - 1) * limit;

    const where: any = { storeId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(storeId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, storeId },
      include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(storeId: string, cashierId: string, dto: CreateOrderDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    // Validate all products exist in this store and have enough stock
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId, active: true },
      include: { inventory: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Check stock
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const stock = product.inventory?.quantity || 0;
      if (stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}: ${stock} available`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = dto.items.map(item => {
      const product = productMap.get(item.productId)!;
      const discount = item.discount || 0;
      const itemTotal = product.price * item.quantity * (1 - discount / 100);
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        quantity: item.quantity,
        discount,
        total: +itemTotal.toFixed(2),
      };
    });

    const discountPct = dto.discountPct || 0;
    const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
    const afterDiscount = subtotal - discountAmt;
    const taxPct = store.taxRate;
    const taxAmt = +(afterDiscount * taxPct / 100).toFixed(2);
    const total = +(afterDiscount + taxAmt).toFixed(2);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          storeId,
          orderNumber,
          cashierId,
          customerId: dto.customerId || null,
          status: OrderStatus.PENDING,
          subtotal: +subtotal.toFixed(2),
          discountPct,
          discountAmt,
          taxPct,
          taxAmt,
          total,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          items: { create: orderItems },
          payment: {
            create: {
              storeId,
              method: dto.paymentMethod,
              amount: total,
              status: PaymentStatus.PENDING,
              cashGiven: dto.cashGiven || null,
              changeGiven: dto.cashGiven ? Math.max(0, dto.cashGiven - total) : null,
            },
          },
        },
        include: { items: true, customer: true, payment: true, cashier: { select: { name: true } } },
      });
      return newOrder;
    });

    this.gateway.emitNewOrder(storeId, order);
    return order;
  }

  async updateStatus(storeId: string, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(storeId, id);

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true, customer: true, payment: true },
    });

    // On completion: deduct stock + update loyalty + mark payment success
    if (dto.status === OrderStatus.COMPLETED) {
      await this.inventoryService.deductStockForOrder(storeId, id);

      if (order.customerId) {
        await this.customersService.updateAfterOrder(storeId, order.customerId, order.total);
      }

      await this.prisma.payment.update({
        where: { orderId: id },
        data: { status: PaymentStatus.SUCCESS, processedAt: new Date() },
      });

      // Check for low stock and emit alerts
      for (const item of order.items) {
        const inv = await this.prisma.inventory.findFirst({
          where: { productId: item.productId },
          include: { product: true },
        });
        if (inv && inv.quantity <= inv.minStock) {
          this.gateway.emitLowStockAlert(storeId, item.productId, item.productName, inv.quantity);
        }
      }
    }

    if (dto.status === OrderStatus.CANCELLED || dto.status === OrderStatus.REFUNDED) {
      await this.prisma.payment.update({
        where: { orderId: id },
        data: { status: dto.status === OrderStatus.REFUNDED ? PaymentStatus.REFUNDED : PaymentStatus.FAILED },
      });
    }

    this.gateway.emitOrderStatusUpdate(storeId, id, dto.status);
    return updated;
  }
}
