import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreditTopUpRequest, CreditTopUpRequestSchema } from '@cineora/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtUserPayload } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreditsService } from './credits.service';

@ApiTags('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('wallet')
  getWallet(@CurrentUser() user: JwtUserPayload) {
    return this.creditsService.getWalletSummary(user.sub);
  }

  @Post('topup')
  @Roles('ADMIN', 'PRODUCER', 'CREATOR')
  topUp(
    @CurrentUser() user: JwtUserPayload,
    @Body(new ZodValidationPipe(CreditTopUpRequestSchema)) body: CreditTopUpRequest,
  ) {
    return this.creditsService.topUp(user.sub, body);
  }
}
