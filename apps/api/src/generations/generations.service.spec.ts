import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { GenerationsService } from './generations.service';
import { OrchestratorClient } from './orchestrator.client';

describe('GenerationsService', () => {
  const prismaMock = {
    scene: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    generation: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  const projectsMock = {
    assertOwnership: vi.fn().mockResolvedValue(undefined),
  };

  const creditsMock = {
    reserve: vi.fn(),
    settle: vi.fn(),
    refund: vi.fn(),
  };

  const orchestratorMock = {
    dispatchGeneration: vi.fn(),
    pollGeneration: vi.fn(),
  };

  let service: GenerationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GenerationsService(
      prismaMock as unknown as PrismaService,
      projectsMock as unknown as ProjectsService,
      creditsMock as unknown as CreditsService,
      orchestratorMock as unknown as OrchestratorClient,
    );
  });

  it('reserves credits and dispatches LIVE generation with continuity context', async () => {
    prismaMock.scene.findFirst.mockResolvedValue({
      id: 'scene_1',
      title: 'Opening Rooftop',
      durationSeconds: 5,
      visualPrompt: 'Camera tracks across a rain-slicked cyberpunk rooftop at dusk.',
      shotType: 'WIDE',
      cameraMovement: 'TRACKING',
      lightingPreset: 'NEON_NOIR',
      continuityNotes: 'Keep neon sign magenta',
      project: {
        id: 'proj_1',
        ownerId: 'user_1',
        targetResolution: 'UHD_4K',
        aspectRatio: '16:9',
        targetFps: 24,
        colorProfile: 'BT2020_HDR',
        styleBibleNotes: 'Anamorphic lens flares',
        characters: [],
      },
    });
    prismaMock.generation.create.mockResolvedValue({ id: 'gen_1' });
    creditsMock.reserve.mockResolvedValue({ id: 'tx_res_1' });
    orchestratorMock.dispatchGeneration.mockResolvedValue({
      mode: 'LIVE',
      isSimulated: false,
      provider: 'google-veo',
      model: 'veo-3-cinema',
      providerJobId: 'veo_op_123',
      status: 'DISPATCHED',
      compiledPrompt: 'Compiled 4K prompt',
      negativePrompt: 'blurry',
    });
    prismaMock.generation.update.mockResolvedValue({
      id: 'gen_1',
      provider: 'google-veo',
      providerJobId: 'veo_op_123',
      status: 'DISPATCHED',
    });

    const result = await service.triggerSceneGeneration('proj_1', 'scene_1', 'user_1', {
      mode: 'LIVE',
      qualityTier: 'CINEMA_MASTER',
      requiresLipSync: false,
      requiresNativeAudio: false,
    });

    expect(creditsMock.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        amount: 60, // 5s * 12 credits/s
        idempotencyKey: 'gen:gen_1:reserve',
      }),
    );
    expect(result.reservedCredits).toBe(60);
    expect(result.isSimulated).toBe(false);
    expect(result.generation.providerJobId).toBe('veo_op_123');
  });

  it('automatically refunds reserved credits when LIVE provider dispatch fails', async () => {
    prismaMock.scene.findFirst.mockResolvedValue({
      id: 'scene_1',
      title: 'Studio Close-Up',
      durationSeconds: 5,
      visualPrompt: 'Close-up of host delivering breaking news in a bright broadcast studio.',
      shotType: 'CLOSE_UP',
      cameraMovement: 'STATIC',
      lightingPreset: 'STUDIO_SOFTBOX',
      continuityNotes: null,
      project: {
        id: 'proj_1',
        ownerId: 'user_1',
        targetResolution: 'P1080',
        aspectRatio: '16:9',
        targetFps: 30,
        colorProfile: 'BT709',
        styleBibleNotes: null,
        characters: [],
      },
    });
    prismaMock.generation.create.mockResolvedValue({ id: 'gen_2' });
    creditsMock.reserve.mockResolvedValue({ id: 'tx_res_2' });
    orchestratorMock.dispatchGeneration.mockRejectedValue(
      new Error('RUNWAY_API_KEY is not configured'),
    );
    prismaMock.generation.update.mockResolvedValue({
      id: 'gen_2',
      status: 'FAILED',
      errorCode: 'DISPATCH_FAILED',
    });

    const result = await service.triggerSceneGeneration('proj_1', 'scene_1', 'user_1', {
      mode: 'LIVE',
      qualityTier: 'HIGH',
      requiresLipSync: false,
      requiresNativeAudio: false,
    });

    expect(creditsMock.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        amount: 40, // 5s * 8 credits/s
        idempotencyKey: 'gen:gen_2:refund',
      }),
    );
    expect(result.generation.status).toBe('FAILED');
    expect(result.reservedCredits).toBe(0);
  });

  it('settles reserved credits and activates first completed take on reconciliation', async () => {
    prismaMock.generation.findUnique.mockResolvedValue({
      id: 'gen_3',
      sceneId: 'scene_1',
      mode: 'LIVE',
      provider: 'runway',
      providerJobId: 'rw_777',
      qualityTier: 'HIGH',
      rawAssetKey: null,
      scene: {
        id: 'scene_1',
        durationSeconds: 5,
        activeGenerationId: null,
        project: { ownerId: 'user_1' },
      },
    });
    orchestratorMock.pollGeneration.mockResolvedValue({
      providerJobId: 'rw_777',
      status: 'COMPLETED',
      outputUrl: 'https://storage.example.com/rw_777.mp4',
      errorMessage: null,
    });
    prismaMock.generation.update.mockResolvedValue({
      id: 'gen_3',
      status: 'COMPLETED',
    });

    const reconciled = await service.reconcileGeneration('gen_3', 'user_1');
    expect(creditsMock.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        amount: 40,
        idempotencyKey: 'gen:gen_3:settle',
      }),
    );
    expect(prismaMock.scene.update).toHaveBeenCalledWith({
      where: { id: 'scene_1' },
      data: { activeGenerationId: 'gen_3' },
    });
    expect(reconciled.status).toBe('COMPLETED');
  });

  it('skips credit reservation in DEMO mode and marks simulation honestly', async () => {
    prismaMock.scene.findFirst.mockResolvedValue({
      id: 'scene_1',
      title: 'Demo Dry Run',
      durationSeconds: 5,
      visualPrompt: 'Golden hour tracking shot along a coastal cliff highway.',
      shotType: 'AERIAL',
      cameraMovement: 'DRONE_ORBIT',
      lightingPreset: 'NATURAL_GOLDEN_HOUR',
      continuityNotes: null,
      project: {
        id: 'proj_1',
        ownerId: 'user_1',
        targetResolution: 'P1080',
        aspectRatio: '16:9',
        targetFps: 24,
        colorProfile: 'REC709_FILMIC',
        styleBibleNotes: null,
        characters: [],
      },
    });
    prismaMock.generation.create.mockResolvedValue({ id: 'gen_demo' });
    orchestratorMock.dispatchGeneration.mockResolvedValue({
      mode: 'DEMO',
      isSimulated: true,
      provider: 'google-veo',
      model: 'veo-3-cinema',
      providerJobId: 'demo-abc123',
      status: 'COMPLETED',
      compiledPrompt: 'Compiled demo prompt',
      negativePrompt: 'blurry',
      notice: 'DEMO MODE dry-run only',
    });
    prismaMock.generation.update.mockResolvedValue({
      id: 'gen_demo',
      mode: 'DEMO',
      status: 'COMPLETED',
    });

    const result = await service.triggerSceneGeneration('proj_1', 'scene_1', 'user_1', {
      mode: 'DEMO',
      qualityTier: 'HIGH',
      requiresLipSync: false,
      requiresNativeAudio: false,
    });

    expect(creditsMock.reserve).not.toHaveBeenCalled();
    expect(result.isSimulated).toBe(true);
    expect(result.reservedCredits).toBe(0);
  });
});
