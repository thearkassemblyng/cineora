import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TriggerSceneGenerationRequest } from '@cineora/contracts';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { OrchestratorClient } from './orchestrator.client';

const CREDITS_PER_SECOND_BY_TIER: Record<'STANDARD' | 'HIGH' | 'CINEMA_MASTER', number> = {
  STANDARD: 6,
  HIGH: 8,
  CINEMA_MASTER: 12,
};

@Injectable()
export class GenerationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly creditsService: CreditsService,
    private readonly orchestratorClient: OrchestratorClient,
  ) {}

  estimateCredits(
    durationSeconds: number,
    qualityTier: 'STANDARD' | 'HIGH' | 'CINEMA_MASTER',
    mode: 'LIVE' | 'DEMO',
  ): number {
    if (mode === 'DEMO') {
      return 0;
    }
    return durationSeconds * CREDITS_PER_SECOND_BY_TIER[qualityTier];
  }

  async triggerSceneGeneration(
    projectId: string,
    sceneId: string,
    ownerId: string,
    input: TriggerSceneGenerationRequest,
  ) {
    await this.projectsService.assertOwnership(projectId, ownerId);

    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, projectId },
      include: {
        project: {
          include: { characters: true },
        },
      },
    });
    if (!scene) {
      throw new NotFoundException('Scene not found in project');
    }

    const resolution = scene.project.targetResolution === 'UHD_4K' ? '4K' : '1080P';
    const creditCost = this.estimateCredits(
      scene.durationSeconds,
      input.qualityTier,
      input.mode,
    );

    const generation = await this.prisma.generation.create({
      data: {
        sceneId: scene.id,
        mode: input.mode,
        provider: input.preferredProvider || 'auto-quality-first',
        model: input.preferredModel || 'auto',
        qualityTier: input.qualityTier,
        resolution,
        fps: scene.project.targetFps,
        seed: input.seed,
        compiledPrompt: scene.visualPrompt,
        status: 'QUEUED',
      },
    });

    let reservationId: string | null = null;
    if (creditCost > 0) {
      const reservation = await this.creditsService.reserve({
        userId: ownerId,
        amount: creditCost,
        idempotencyKey: `gen:${generation.id}:reserve`,
        referenceType: 'GENERATION',
        referenceId: generation.id,
        notes: `Reserved ${creditCost} credits for scene "${scene.title}" (${input.qualityTier})`,
      });
      reservationId = reservation.id;
    }

    try {
      const dispatch = await this.orchestratorClient.dispatchGeneration({
        mode: input.mode,
        qualityTier: input.qualityTier,
        targetResolution: resolution,
        aspectRatio: scene.project.aspectRatio,
        durationSeconds: scene.durationSeconds,
        preferredProvider: input.preferredProvider,
        preferredModel: input.preferredModel,
        requiresLipSync: input.requiresLipSync,
        requiresNativeAudio: input.requiresNativeAudio,
        seed: input.seed,
        visualPrompt: scene.visualPrompt,
        shotType: scene.shotType,
        cameraMovement: scene.cameraMovement,
        lightingPreset: scene.lightingPreset,
        colorProfile: scene.project.colorProfile,
        styleBibleNotes: scene.project.styleBibleNotes,
        continuityNotes: scene.continuityNotes,
        characters: scene.project.characters.map((c) => ({
          name: c.name,
          appearanceNotes: c.appearanceNotes,
          wardrobeNotes: c.wardrobeNotes,
          referenceImageUrl: c.referenceImageUrl,
        })),
      });

      const updated = await this.prisma.generation.update({
        where: { id: generation.id },
        data: {
          provider: dispatch.provider,
          model: dispatch.model,
          providerJobId: dispatch.providerJobId,
          compiledPrompt: dispatch.compiledPrompt,
          status: dispatch.status,
          creditReservationId: reservationId,
          startedAt: new Date(),
          completedAt: dispatch.status === 'COMPLETED' ? new Date() : null,
        },
      });

      return {
        generation: updated,
        isSimulated: dispatch.isSimulated,
        notice: dispatch.notice ?? null,
        reservedCredits: creditCost,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown provider dispatch error';
      if (creditCost > 0) {
        await this.creditsService.refund({
          userId: ownerId,
          amount: creditCost,
          idempotencyKey: `gen:${generation.id}:refund`,
          referenceType: 'GENERATION',
          referenceId: generation.id,
          notes: `Auto-refunded after dispatch failure: ${message.slice(0, 120)}`,
        });
      }

      const failed = await this.prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          errorCode: 'DISPATCH_FAILED',
          errorMessage: message,
          creditReservationId: reservationId,
          completedAt: new Date(),
        },
      });

      return {
        generation: failed,
        isSimulated: false,
        notice: 'Generation dispatch failed; any reserved credits have been automatically refunded.',
        reservedCredits: 0,
      };
    }
  }

  async listSceneGenerations(projectId: string, sceneId: string, ownerId: string) {
    await this.projectsService.assertOwnership(projectId, ownerId);
    return this.prisma.generation.findMany({
      where: { sceneId, scene: { projectId } },
      orderBy: { createdAt: 'desc' },
      include: { qualityReport: true },
    });
  }

  async reconcileGeneration(generationId: string, ownerId: string) {
    const generation = await this.prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        scene: {
          include: { project: true },
        },
      },
    });
    if (!generation) {
      throw new NotFoundException('Generation record not found');
    }
    if (generation.scene.project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this generation');
    }
    if (!generation.providerJobId) {
      return generation;
    }

    const poll = await this.orchestratorClient.pollGeneration(
      generation.provider,
      generation.providerJobId,
    );

    const creditCost = this.estimateCredits(
      generation.scene.durationSeconds,
      generation.qualityTier,
      generation.mode,
    );

    if (poll.status === 'COMPLETED') {
      if (creditCost > 0) {
        await this.creditsService.settle({
          userId: ownerId,
          amount: creditCost,
          idempotencyKey: `gen:${generation.id}:settle`,
          referenceType: 'GENERATION',
          referenceId: generation.id,
          notes: 'Settled upon verified provider completion',
        });
      }

      const updated = await this.prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          rawAssetKey: poll.outputUrl ?? generation.rawAssetKey,
          completedAt: new Date(),
        },
      });

      if (!generation.scene.activeGenerationId) {
        await this.prisma.scene.update({
          where: { id: generation.sceneId },
          data: { activeGenerationId: generation.id },
        });
      }
      return updated;
    }

    if (poll.status === 'FAILED') {
      if (creditCost > 0) {
        await this.creditsService.refund({
          userId: ownerId,
          amount: creditCost,
          idempotencyKey: `gen:${generation.id}:refund`,
          referenceType: 'GENERATION',
          referenceId: generation.id,
          notes: `Refunded after provider failure: ${poll.errorMessage ?? 'unknown'}`,
        });
      }
      return this.prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          errorCode: 'PROVIDER_FAILED',
          errorMessage: poll.errorMessage ?? 'Provider reported generation failure',
          completedAt: new Date(),
        },
      });
    }

    return this.prisma.generation.update({
      where: { id: generation.id },
      data: { status: 'PROCESSING' },
    });
  }
}
