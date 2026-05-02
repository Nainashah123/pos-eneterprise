// WHY: Controller, Post, Get, Patch are decorators — they tell NestJS "this class handles HTTP requests at this path with this method".
// WHY: Body extracts the request body (the JSON the client sent). UseGuards applies security middleware to a specific route.
// WHY: HttpCode lets us override the default status code (201 for POST) — e.g. some POSTs should return 200 not 201.
import { Controller, Post, Get, Patch, Body, UseGuards, HttpCode } from '@nestjs/common';

// WHY: ApiTags, ApiOperation, ApiBearerAuth are Swagger decorators — they add documentation metadata to the auto-generated API docs page.
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

// WHY: AuthService contains all the actual business logic (checking passwords, generating tokens) — the controller just receives HTTP requests and delegates to it.
import { AuthService } from './auth.service';

// WHY: DTOs (Data Transfer Objects) define the exact shape and validation rules for the data we expect from the client in each request.
import { RegisterDto } from './dto/register.dto';       // WHY: defines required fields for registering (name, email, password, storeId).
import { LoginDto } from './dto/login.dto';             // WHY: defines required fields for logging in (email, password, storeId).
import { RefreshTokenDto } from './dto/refresh-token.dto'; // WHY: defines the refreshToken field needed to get a new access token.
import { UpdateProfileDto } from './dto/update-profile.dto'; // WHY: defines which profile fields a user can update (name, email).
import { ChangePasswordDto } from './dto/change-password.dto'; // WHY: defines currentPassword and newPassword fields for a password change.

// WHY: @Public() is a custom decorator that marks a route as "no authentication needed" — it overrides the global JwtAuthGuard.
import { Public } from '../../common/decorators/public.decorator';

// WHY: JwtAuthGuard checks that the incoming request has a valid JWT Bearer token — routes without @Public() require this.
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// WHY: @CurrentUser() is a custom decorator that extracts the logged-in user's info from the JWT payload so we don't have to parse the token manually.
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// WHY: JwtPayload is a TypeScript interface (a type contract) that describes the shape of data stored inside the JWT (sub, email, role, storeId).
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

// WHY: @ApiTags('auth') groups all routes in this controller under the "auth" section in the Swagger docs UI.
@ApiTags('auth')

// WHY: @Controller('auth') tells NestJS that all routes defined in this class are prefixed with /auth — so POST /auth/login, GET /auth/me, etc.
@Controller('auth')
export class AuthController {
  // WHY: This is dependency injection — NestJS automatically creates and provides an AuthService instance here; we don't need to write `new AuthService()`.
  constructor(private readonly authService: AuthService) {}

  // WHY: @Public() marks this route as open to everyone — no JWT required since the user doesn't have a token yet before registering.
  @Public()
  // WHY: @Post('register') maps this method to HTTP POST /auth/register.
  @Post('register')
  // WHY: @ApiOperation describes this endpoint in the Swagger docs so developers know what it does without reading code.
  @ApiOperation({ summary: 'Register a new user' })
  // WHY: @Body() dto extracts the JSON body from the request and validates it against RegisterDto's rules automatically (thanks to global ValidationPipe).
  register(@Body() dto: RegisterDto) {
    // WHY: We delegate to authService — the controller's only job is to receive the HTTP request and call the right service method.
    return this.authService.register(dto);
  }

  @Public() // WHY: Login is public — the user is not authenticated yet when they call this.
  @Post('login')
  @HttpCode(200) // WHY: By default NestJS returns 201 for POST, but login is not "creating" a resource — 200 (OK) is more semantically correct.
  @ApiOperation({ summary: 'Login and get tokens' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public() // WHY: Refresh is public because the client uses a refresh token (not the expired access token) to get a new access token.
  @Post('refresh')
  @HttpCode(200) // WHY: Again, 200 is more appropriate than 201 because we're refreshing, not creating a new resource.
  @ApiOperation({ summary: 'Refresh access token' })
  // WHY: dto.refreshToken pulls just the refreshToken string out of the DTO object to pass to the service.
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // WHY: @ApiBearerAuth('access-token') tells the Swagger docs that this route requires a JWT — it shows a lock icon on the docs page.
  @ApiBearerAuth('access-token')
  // WHY: @UseGuards(JwtAuthGuard) is redundant here since it's applied globally, but is explicit for clarity that logout requires a valid token.
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  // WHY: @CurrentUser() reads the decoded JWT payload from the request object — NestJS puts it there after JwtAuthGuard verifies the token.
  logout(@CurrentUser() user: JwtPayload) {
    // WHY: user.sub is the user's unique ID stored in the JWT's "subject" field — standard JWT convention for identifying who the token belongs to.
    return this.authService.logout(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Get('me') // WHY: @Get('me') maps to HTTP GET /auth/me — returns the currently logged-in user's profile.
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Patch('me') // WHY: @Patch means partial update — the client only sends the fields they want to change, not the full user object.
  @ApiOperation({ summary: 'Update own profile (name, email)' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(user.sub, dto);
  }

  @ApiBearerAuth('access-token')
  @Patch('me/password') // WHY: Separate endpoint for password changes because it requires the current password for security verification.
  @HttpCode(200)
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }
}
