import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSceneRequest } from '@cineora/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ScenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async createScene(projectId: string, ownerId: string, input: CreateSceneRequest) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    return this.prisma.scene.create({
      data: {
        projectId,
        orderIndex: input.orderIndex,
        title: input.title.trim(),
        scriptNarration: input.scriptNarration?.trim(),
        visualPrompt: input.visualPrompt.trim(),
        shotType: input.shotType,
        cameraMovement: input.cameraMovement,
        lightingPreset: input.lightingPreset,
        durationSeconds: input.durationSeconds,
        continuityNotes: input.continuityNotes?.trim(),
      },
    });
  }

  async listScenes(projectId: string, ownerId: string) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    return this.prisma.scene.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
      include: {
        generations: {
          orderBy: { createdAt: 'desc' },
          include: { qualityReport: true },
        },
      },
    });
  }

  async updateScene(
    projectId: string,
    sceneId: string,
    ownerId: string,
    input: Partial<CreateSceneRequest>,
  ) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    const existing = await this.prisma.scene.findFirst({
      where: { id: sceneId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Scene not found in project');
    }

    return this.prisma.scene.update({
      where: { id: sceneId },
      data: {
        orderIndex: input.orderIndex ?? existing.orderIndex,
        title: input.title?.trim() ?? existing.title,
        scriptNarration:
          input.scriptNarration !== undefined
            ? input.scriptNarration.trim()
            : existing.scriptNarration,
        visualPrompt: input.visualPrompt?.trim() ?? existing.visualPrompt,
        shotType: input.shotType ?? existing.shotType,
        cameraMovement: input.cameraMovement ?? existing.cameraMovement,
        lightingPreset: input.lightingPreset ?? existing.lightingPreset,
        durationSeconds: input.durationSeconds ?? existing.durationSeconds,
        continuityNotes:
          input.continuityNotes !== undefined
            ? input.continuityNotes.trim()
            : existing.continuityNotes,
      },
    });
  }

  async setActiveGeneration(
    projectId: string,
    sceneId: string,
    generationId: string,
    ownerId: string,
  ) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    const generation = await this.prisma.generation.findFirst({
      where: { id: generationId, sceneId, scene: { projectId } },
    });
    if (!generation) {
      throw new NotFoundException('Generation take not found for this scene');
    }

    return this.prisma.scene.update({
      where: { id: sceneId },
      data: { activeGenerationId: generationId },
    });
  }

  async deleteScene(projectId: string, sceneId: string, ownerId: string) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    const result = await this.prisma.scene.deleteMany({
      where: { id: sceneId, projectId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Scene not found in project');
    }
    return { deleted: true };
  }
}
