import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.payment.findMany({
      where: { storeId },
      include: { order: { select: { orderNumber: true, total: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(storeId: string, id: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id, storeId },
      include: { order: true },
    });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  async processForOrder(storeId: string, orderId: string, dto: ProcessPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment record not found for this order');
    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already processed');
    }

    const changeGiven = dto.method === 'CASH' && dto.cashGiven
      ? Math.max(0, dto.cashGiven - payment.amount)
      : null;

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        method: dto.method,
        status: PaymentStatus.SUCCESS,
        reference: dto.reference,
        cashGiven: dto.cashGiven || null,
        changeGiven,
        processedAt: new Date(),
      },
    });
  }

  async refund(storeId: string, id: string) {
    const p = await this.findOne(storeId, id);
    if (p.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  async getSummary(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, byMethod, todayTotal] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { storeId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { storeId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { storeId, status: PaymentStatus.SUCCESS, createdAt: { gte: today } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalRevenue: total._sum.amount || 0,
      totalTransactions: total._count,
      todayRevenue: todayTotal._sum.amount || 0,
      todayTransactions: todayTotal._count,
      byMethod: byMethod.map(m => ({
        method: m.method,
        revenue: m._sum.amount || 0,
        transactions: m._count,
      })),
    };
  }
}
