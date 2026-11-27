import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateSceneRequest, CreateSceneRequestSchema } from '@cineora/contracts';
import { z } from 'zod';
import { JwtUserPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ScenesService } from './scenes.service';

const UpdateSceneSchema = CreateSceneRequestSchema.partial();
const SetActiveGenerationSchema = z.object({
  generationId: z.string().min(4),
});

@ApiTags('scenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(CreateSceneRequestSchema)) body: CreateSceneRequest,
  ) {
    return this.scenesService.createScene(projectId, user.sub, body);
  }

  @Get()
  list(@CurrentUser() user: JwtUserPayload, @Param('projectId') projectId: string) {
    return this.scenesService.listScenes(projectId, user.sub);
  }

  @Patch(':sceneId')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body(new ZodValidationPipe(UpdateSceneSchema)) body: Partial<CreateSceneRequest>,
  ) {
    return this.scenesService.updateScene(projectId, sceneId, user.sub, body);
  }

  @Patch(':sceneId/active-generation')
  setActiveGeneration(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body(new ZodValidationPipe(SetActiveGenerationSchema))
    body: { generationId: string },
  ) {
    return this.scenesService.setActiveGeneration(
      projectId,
      sceneId,
      body.generationId,
      user.sub,
    );
  }

  @Delete(':sceneId')
  remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.scenesService.deleteScene(projectId, sceneId, user.sub);
  }
}
