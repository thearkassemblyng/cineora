import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { RendersService } from './renders.service';

describe('RendersService', () => {
  const prismaMock = {
    scene: {
      findMany: vi.fn(),
    },
    renderJob: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    generation: {
      findUnique: vi.fn(),
    },
    qualityReport: {
      upsert: vi.fn(),
    },
  };

  const projectsMock = {
    assertOwnership: vi.fn().mockResolvedValue(undefined),
  };

  let service: RendersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RendersService(
      prismaMock as unknown as PrismaService,
      projectsMock as unknown as ProjectsService,
    );
  });

  it('rejects project render when scenes lack completed live video assets', async () => {
    prismaMock.scene.findMany.mockResolvedValue([
      {
        id: 'scene_1',
        activeGenerationId: null,
        generations: [],
      },
    ]);

    await expect(
      service.triggerProjectRender('proj_1', 'user_1', {
        exportPreset: 'CINEMA_4K',
        loudnessTargetLufs: -16,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a queued CINEMA_4K render job when all scenes have active completed assets', async () => {
    prismaMock.scene.findMany.mockResolvedValue([
      {
        id: 'scene_1',
        activeGenerationId: 'gen_1',
        generations: [
          { id: 'gen_1', status: 'COMPLETED', rawAssetKey: 'scenes/u1/s1.mp4' },
        ],
      },
    ]);
    prismaMock.renderJob.create.mockResolvedValue({
      id: 'render_1',
      exportPreset: 'CINEMA_4K',
      status: 'QUEUED',
    });

    const job = await service.triggerProjectRender('proj_1', 'user_1', {
      exportPreset: 'CINEMA_4K',
      loudnessTargetLufs: -16,
    });

    expect(job.id).toBe('render_1');
    expect(job.exportPreset).toBe('CINEMA_4K');
  });

  it('persists automated QualityReport for a generation', async () => {
    prismaMock.generation.findUnique.mockResolvedValue({
      id: 'gen_1',
      scene: { project: { ownerId: 'user_1' } },
    });
    prismaMock.qualityReport.upsert.mockResolvedValue({
      id: 'qc_1',
      generationId: 'gen_1',
      passed: true,
    });

    const report = await service.saveQualityReport('gen_1', 'user_1', {
      width: 3840,
      height: 2160,
      fps: 24,
      bitrateKbps: 26000,
      sharpnessScore: 93,
      flickerScore: 96,
      avSyncOffsetMs: 8,
      artifactFlags: [],
      passed: true,
      recommendations: [],
    });

    expect(report.passed).toBe(true);
  });
});
