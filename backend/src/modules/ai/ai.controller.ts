// WHY: We import the HTTP decorators we need for this controller.
//   - Controller → marks this class as a route handler
//   - Get/Post   → map methods to HTTP GET or POST
//   - Body       → extracts the JSON request body
//   - UseGuards  → attaches security middleware
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';

// WHY: Swagger decorators generate the interactive API docs automatically.
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

// WHY: AiService holds all the "AI" logic — forecasting, recommendations, fraud detection, chat.
import { AiService } from './ai.service';

// WHY: ChatMessageDto validates the POST /ai/chat request body.
//   It expects { "message": "some question" } — the DTO enforces this shape.
import { ChatMessageDto } from './dto/chat-message.dto';

// WHY: JwtAuthGuard ensures all AI routes require a valid login token.
//   AI insights are sensitive business data — anonymous access is not allowed.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: @StoreId() reads the storeId out of the JWT so every AI query is
//   automatically scoped to the logged-in user's store — no role restriction here,
//   all authenticated users (including cashiers) can use AI features.
import { StoreId } from '../../common/decorators/store-id.decorator';

// WHY: Groups these routes under "ai" in Swagger docs for easy discovery.
@ApiTags('ai')

// WHY: All AI endpoints require a Bearer token — declare it once at class level.
@ApiBearerAuth('access-token')

// WHY: Apply JWT guard to every route in this controller.
//   Note: No RolesGuard or @Roles here — all roles (ADMIN, MANAGER, CASHIER)
//   can access AI features. We only need the JWT check, not a role check.
@UseGuards(JwtAuthGuard)

// WHY: @Controller('ai') makes all routes start with /api/v1/ai.
@Controller('ai')
export class AiController {

  // WHY: NestJS injects AiService automatically via dependency injection.
  constructor(private readonly aiService: AiService) {}

  // WHY: GET /api/v1/ai/sales-prediction — returns a 7-day revenue forecast.
  //   The service uses the store's historical sales data to project future revenue.
  @Get('sales-prediction')
  @ApiOperation({ summary: '7-day sales revenue forecast' })
  getSalesPrediction(@StoreId() storeId: string) {
    return this.aiService.getSalesPrediction(storeId);
  }

  // WHY: GET /api/v1/ai/recommendations — returns smart business tips.
  //   e.g. "Product X is low in stock", "Product Y has a low margin — consider repricing".
  @Get('recommendations')
  @ApiOperation({ summary: 'Smart operational recommendations' })
  getRecommendations(@StoreId() storeId: string) {
    return this.aiService.getRecommendations(storeId);
  }

  // WHY: GET /api/v1/ai/fraud-detection — scans recent orders for suspicious patterns.
  //   e.g. very high discounts, unusually large cash payments, bulk purchases.
  @Get('fraud-detection')
  @ApiOperation({ summary: 'Fraud risk flags for recent orders' })
  detectFraud(@StoreId() storeId: string) {
    return this.aiService.detectFraud(storeId);
  }

  // WHY: POST /api/v1/ai/chat — a simple question-answering endpoint.
  //   The user sends a message (e.g. "How do I increase revenue?") and gets
  //   a context-aware text reply based on their store's actual data.
  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI sales assistant' })
  // WHY: @Body() extracts the JSON body and validates it against ChatMessageDto.
  //   The DTO ensures `message` is present and is a non-empty string.
  chat(@StoreId() storeId: string, @Body() dto: ChatMessageDto) {
    return this.aiService.chat(storeId, dto.message);
  }
}
