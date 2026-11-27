import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TriggerRenderRequest, TriggerRenderRequestSchema } from '@cineora/contracts';
import { z } from 'zod';
import { JwtUserPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RendersService, SaveQualityReportInput } from './renders.service';

const SaveQcReportSchema = z.object({
  width: z.number().int().min(0),
  height: z.number().int().min(0),
  fps: z.number().min(0),
  bitrateKbps: z.number().int().min(0).optional(),
  sharpnessScore: z.number().min(0).max(100),
  flickerScore: z.number().min(0).max(100),
  avSyncOffsetMs: z.number().min(0),
  artifactFlags: z.array(z.string()),
  passed: z.boolean(),
  recommendations: z.array(z.string()),
});

@ApiTags('renders & qc')
@Controller()
export class RendersController {
  constructor(private readonly rendersService: RendersService) {}

  @Get('enhancements/capabilities')
  getEnhancementCapabilities() {
    return this.rendersService.getEnhancementCapabilities();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/renders')
  triggerRender(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(TriggerRenderRequestSchema)) body: TriggerRenderRequest,
  ) {
    return this.rendersService.triggerProjectRender(projectId, user.sub, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/renders')
  listRenders(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.rendersService.listProjectRenders(projectId, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('renders/:renderId')
  getRender(@CurrentUser() user: JwtUserPayload, @Param('renderId') renderId: string) {
    return this.rendersService.getRenderById(renderId, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generations/:generationId/qc-report')
  saveQcReport(
    @CurrentUser() user: JwtUserPayload,
    @Param('generationId') generationId: string,
    @Body(new ZodValidationPipe(SaveQcReportSchema)) body: SaveQualityReportInput,
  ) {
    return this.rendersService.saveQualityReport(generationId, user.sub, body);
  }
}
