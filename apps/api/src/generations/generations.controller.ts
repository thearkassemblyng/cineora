import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  TriggerSceneGenerationRequest,
  TriggerSceneGenerationRequestSchema,
} from '@cineora/contracts';
import { JwtUserPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GenerationsService } from './generations.service';
import { OrchestratorClient } from './orchestrator.client';

@ApiTags('generations')
@Controller()
export class GenerationsController {
  constructor(
    private readonly generationsService: GenerationsService,
    private readonly orchestratorClient: OrchestratorClient,
  ) {}

  @Get('providers')
  listProviders() {
    return this.orchestratorClient.listProviders();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/scenes/:sceneId/generations')
  triggerSceneGeneration(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body(new ZodValidationPipe(TriggerSceneGenerationRequestSchema))
    body: TriggerSceneGenerationRequest,
  ) {
    return this.generationsService.triggerSceneGeneration(
      projectId,
      sceneId,
      user.sub,
      body,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/scenes/:sceneId/generations')
  listSceneGenerations(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.generationsService.listSceneGenerations(projectId, sceneId, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generations/:generationId/reconcile')
  reconcile(
    @CurrentUser() user: JwtUserPayload,
    @Param('generationId') generationId: string,
  ) {
    return this.generationsService.reconcileGeneration(generationId, user.sub);
  }
}
