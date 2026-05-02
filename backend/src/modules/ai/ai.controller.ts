import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreId } from '../../common/decorators/store-id.decorator';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('sales-prediction')
  @ApiOperation({ summary: '7-day sales revenue forecast' })
  getSalesPrediction(@StoreId() storeId: string) {
    return this.aiService.getSalesPrediction(storeId);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Smart operational recommendations' })
  getRecommendations(@StoreId() storeId: string) {
    return this.aiService.getRecommendations(storeId);
  }

  @Get('fraud-detection')
  @ApiOperation({ summary: 'Fraud risk flags for recent orders' })
  detectFraud(@StoreId() storeId: string) {
    return this.aiService.detectFraud(storeId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI sales assistant' })
  chat(@StoreId() storeId: string, @Body() dto: ChatMessageDto) {
    return this.aiService.chat(storeId, dto.message);
  }
}
