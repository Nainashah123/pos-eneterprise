import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Positive = add, negative = subtract' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ enum: StockMovementType, example: StockMovementType.ADJUSTMENT })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiPropertyOptional({ example: 'Received from supplier' })
  @IsOptional()
  @IsString()
  note?: string;
}
