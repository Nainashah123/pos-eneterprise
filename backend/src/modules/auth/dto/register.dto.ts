import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'store-default' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'cashier@posapp.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Cashier@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CASHIER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
