import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateCharacterAssetRequest,
  CreateProjectRequest,
  UpdateStyleBibleRequest,
} from '@cineora/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapResolutionToPrisma(res: '1080P' | '4K'): 'P1080' | 'UHD_4K' {
    return res === '4K' ? 'UHD_4K' : 'P1080';
  }

  async create(ownerId: string, input: CreateProjectRequest) {
    return this.prisma.project.create({
      data: {
        ownerId,
        title: input.title.trim(),
        description: input.description?.trim(),
        format: input.format,
        aspectRatio: input.aspectRatio,
        targetResolution: this.mapResolutionToPrisma(input.targetResolution),
        targetFps: input.targetFps,
        colorProfile: input.colorProfile,
      },
      include: {
        characters: true,
        scenes: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async listByOwner(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { scenes: true, characters: true, renders: true },
        },
      },
    });
  }

  async getByIdForOwner(projectId: string, ownerId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { createdAt: 'asc' } },
        scenes: {
          orderBy: { orderIndex: 'asc' },
          include: {
            generations: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: { qualityReport: true },
            },
          },
        },
        audioTracks: true,
        renders: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return project;
  }

  async updateStyleBible(
    projectId: string,
    ownerId: string,
    input: UpdateStyleBibleRequest,
  ) {
    await this.assertOwnership(projectId, ownerId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { styleBibleNotes: input.styleBibleNotes },
    });
  }

  async addCharacterAsset(
    projectId: string,
    ownerId: string,
    input: CreateCharacterAssetRequest,
  ) {
    await this.assertOwnership(projectId, ownerId);
    return this.prisma.characterAsset.create({
      data: {
        projectId,
        name: input.name.trim(),
        appearanceNotes: input.appearanceNotes.trim(),
        wardrobeNotes: input.wardrobeNotes?.trim(),
        referenceImageUrl: input.referenceImageUrl,
      },
    });
  }

  async removeCharacterAsset(projectId: string, characterId: string, ownerId: string) {
    await this.assertOwnership(projectId, ownerId);
    const deleted = await this.prisma.characterAsset.deleteMany({
      where: { id: characterId, projectId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Character asset not found in project');
    }
    return { deleted: true };
  }

  async deleteProject(projectId: string, ownerId: string) {
    await this.assertOwnership(projectId, ownerId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { deleted: true };
  }

  async assertOwnership(projectId: string, ownerId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }
}
