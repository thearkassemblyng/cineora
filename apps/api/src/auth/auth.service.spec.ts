import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-unit-tests-only';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-only';
    service = new AuthService(prismaMock as unknown as PrismaService);
  });

  it('registers a new creator, initializes credit wallet, and returns JWT pair', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'director@cineora.studio',
      fullName: 'Ava Director',
      role: 'CREATOR',
      passwordHash: 'hashed',
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt_1' });

    const tokens = await service.register({
      email: 'Director@Cineora.Studio',
      password: 'StrongPassword123!',
      fullName: 'Ava Director',
    });

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.user.email).toBe('director@cineora.studio');
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'director@cineora.studio',
          wallet: { create: { availableCredits: 0, reservedCredits: 0 } },
        }),
      }),
    );
  });

  it('rejects duplicate email registration with ConflictException', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.register({
        email: 'dup@cineora.studio',
        password: 'StrongPassword123!',
        fullName: 'Dup User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rotates refresh token and revokes the previous token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_2',
      email: 'producer@cineora.studio',
      fullName: 'Sam Producer',
      role: 'PRODUCER',
      passwordHash: 'hashed',
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt_init' });

    const initial = await service.register({
      email: 'producer@cineora.studio',
      password: 'StrongPassword123!',
      fullName: 'Sam Producer',
    });

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_init',
      userId: 'user_2',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user_2',
        email: 'producer@cineora.studio',
        fullName: 'Sam Producer',
        role: 'PRODUCER',
      },
    });
    prismaMock.refreshToken.update.mockResolvedValue({ id: 'rt_init' });

    const rotated = await service.refresh(initial.refreshToken);
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt_init' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });

  it('rejects revoked refresh tokens', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_3',
      email: 'revoked@cineora.studio',
      fullName: 'Revoked User',
      role: 'CREATOR',
      passwordHash: 'hashed',
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt_rev' });

    const initial = await service.register({
      email: 'revoked@cineora.studio',
      password: 'StrongPassword123!',
      fullName: 'Revoked User',
    });

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_rev',
      userId: 'user_3',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user_3', email: 'revoked@cineora.studio', fullName: 'Revoked User', role: 'CREATOR' },
    });

    await expect(service.refresh(initial.refreshToken)).rejects.toThrow(UnauthorizedException);
  });
});
