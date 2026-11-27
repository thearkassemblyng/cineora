import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  LoginRequest,
  LoginRequestSchema,
  RefreshTokenRequest,
  RefreshTokenRequestSchema,
  RegisterRequest,
  RegisterRequestSchema,
} from '@cineora/contracts';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtUserPayload } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(new RateLimitGuard(20, 60_000))
  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterRequestSchema)) body: RegisterRequest) {
    return this.authService.register(body);
  }

  @UseGuards(new RateLimitGuard(30, 60_000))
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest) {
    return this.authService.login(body);
  }

  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(RefreshTokenRequestSchema)) body: RefreshTokenRequest,
  ) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(
    @Body(new ZodValidationPipe(RefreshTokenRequestSchema)) body: RefreshTokenRequest,
  ) {
    return this.authService.logout(body.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtUserPayload) {
    return this.authService.getProfile(user.sub);
  }
}
