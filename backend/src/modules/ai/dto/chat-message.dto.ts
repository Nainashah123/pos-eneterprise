import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: "What's my best-selling product?" })
  @IsString()
  @MinLength(1)
  message: string;
}
