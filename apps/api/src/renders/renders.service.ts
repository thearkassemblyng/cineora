import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TriggerRenderRequest } from '@cineora/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

export interface SaveQualityReportInput {
  width: number;
  height: number;
  fps: number;
  bitrateKbps?: number;
  sharpnessScore: number;
  flickerScore: number;
  avSyncOffsetMs: number;
  artifactFlags: string[];
  passed: boolean;
  recommendations: string[];
}

export const HONEST_ENHANCEMENT_CAPABILITIES = [
  {
    id: 'DENOISE_HQDN3D',
    label: 'Temporal & Spatial Denoise (hqdn3d)',
    implemented: true,
  },
  {
    id: 'COLOR_GRADE_FILMIC',
    label: 'Filmic Contrast & Color Balance',
    implemented: true,
  },
  {
    id: 'SHARPEN_UNSHARP',
    label: 'Clarity Sharpening (unsharp)',
    implemented: true,
  },
  {
    id: 'UPSCALE_LANCZOS',
    label: 'High-Precision Lanczos Upscaling',
    implemented: true,
  },
] as const;

@Injectable()
export class RendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  getEnhancementCapabilities() {
    return HONEST_ENHANCEMENT_CAPABILITIES;
  }

  async triggerProjectRender(
    projectId: string,
    ownerId: string,
    input: TriggerRenderRequest,
  ) {
    await this.projectsService.assertOwnership(projectId, ownerId);

    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
      include: { generations: true },
    });

    if (scenes.length === 0) {
      throw new BadRequestException('Cannot render a project with zero scenes.');
    }

    const unreadyScenes = scenes.filter((scene) => {
      if (!scene.activeGenerationId) return true;
      const active = scene.generations.find((g) => g.id === scene.activeGenerationId);
      return !active || active.status !== 'COMPLETED' || !active.rawAssetKey;
    });

    if (unreadyScenes.length > 0) {
      throw new BadRequestException({
        message:
          'Some scenes do not have a completed live video asset selected as their active take.',
        unreadySceneIds: unreadyScenes.map((s) => s.id),
      });
    }

    return this.prisma.renderJob.create({
      data: {
        projectId,
        exportPreset: input.exportPreset,
        loudnessTargetLufs: input.loudnessTargetLufs,
        status: 'QUEUED',
        progressPct: 0,
      },
    });
  }

  async listProjectRenders(projectId: string, ownerId: string) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    return this.prisma.renderJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRenderById(renderId: string, ownerId: string) {
    const render = await this.prisma.renderJob.findUnique({
      where: { id: renderId },
      include: { project: { select: { ownerId: true } } },
    });
    if (!render) {
      throw new NotFoundException('Render job not found');
    }
    if (render.project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this render job');
    }
    return render;
  }

  async saveQualityReport(
    generationId: string,
    ownerId: string,
    input: SaveQualityReportInput,
  ) {
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      include: { scene: { include: { project: { select: { ownerId: true } } } } },
    });
    if (!generation) {
      throw new NotFoundException('Generation not found');
    }
    if (generation.scene.project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this generation');
    }

    return this.prisma.qualityReport.upsert({
      where: { generationId },
      create: {
        generationId,
        width: input.width,
        height: input.height,
        fps: input.fps,
        bitrateKbps: input.bitrateKbps,
        sharpnessScore: input.sharpnessScore,
        flickerScore: input.flickerScore,
        avSyncOffsetMs: input.avSyncOffsetMs,
        artifactFlags: input.artifactFlags,
        passed: input.passed,
        recommendations: input.recommendations,
      },
      update: {
        width: input.width,
        height: input.height,
        fps: input.fps,
        bitrateKbps: input.bitrateKbps,
        sharpnessScore: input.sharpnessScore,
        flickerScore: input.flickerScore,
        avSyncOffsetMs: input.avSyncOffsetMs,
        artifactFlags: input.artifactFlags,
        passed: input.passed,
        recommendations: input.recommendations,
        analyzedAt: new Date(),
      },
    });
  }
}
