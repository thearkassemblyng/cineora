import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectsService', () => {
  const prismaMock = {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    characterAsset: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  let service: ProjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectsService(prismaMock as unknown as PrismaService);
  });

  it('maps 4K targetResolution to Prisma UHD_4K enum on project creation', async () => {
    prismaMock.project.create.mockResolvedValue({
      id: 'proj_1',
      title: 'Luxury Watch Spot',
      targetResolution: 'UHD_4K',
    });

    await service.create('user_1', {
      title: 'Luxury Watch Spot',
      format: 'ADVERTISEMENT',
      aspectRatio: '16:9',
      targetResolution: '4K',
      targetFps: 24,
      colorProfile: 'BT2020_HDR',
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user_1',
          targetResolution: 'UHD_4K',
        }),
      }),
    );
  });

  it('blocks access to projects owned by another user', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'proj_secret',
      ownerId: 'other_user',
    });

    await expect(service.getByIdForOwner('proj_secret', 'user_1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
