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
import {
  CreateCharacterAssetRequest,
  CreateCharacterAssetRequestSchema,
  CreateProjectRequest,
  CreateProjectRequestSchema,
  UpdateStyleBibleRequest,
  UpdateStyleBibleRequestSchema,
} from '@cineora/contracts';
import { JwtUserPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateProjectRequestSchema)) body: CreateProjectRequest,
  ) {
    return this.projectsService.create(user.sub, body);
  }

  @Get()
  list(@CurrentUser() user: JwtUserPayload) {
    return this.projectsService.listByOwner(user.sub);
  }

  @Get(':projectId')
  getOne(@CurrentUser() user: JwtUserPayload, @Param('projectId') projectId: string) {
    return this.projectsService.getByIdForOwner(projectId, user.sub);
  }

  @Patch(':projectId/style-bible')
  updateStyleBible(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(UpdateStyleBibleRequestSchema))
    body: UpdateStyleBibleRequest,
  ) {
    return this.projectsService.updateStyleBible(projectId, user.sub, body);
  }

  @Post(':projectId/characters')
  addCharacter(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(CreateCharacterAssetRequestSchema))
    body: CreateCharacterAssetRequest,
  ) {
    return this.projectsService.addCharacterAsset(projectId, user.sub, body);
  }

  @Delete(':projectId/characters/:characterId')
  removeCharacter(
    @CurrentUser() user: JwtUserPayload,
    @Param('projectId') projectId: string,
    @Param('characterId') characterId: string,
  ) {
    return this.projectsService.removeCharacterAsset(projectId, characterId, user.sub);
  }

  @Delete(':projectId')
  remove(@CurrentUser() user: JwtUserPayload, @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId, user.sub);
  }
}
