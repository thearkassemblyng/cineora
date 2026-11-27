import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  AuthTokensResponse,
  LoginRequest,
  RegisterRequest,
} from '@cineora/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUserPayload, UserRoleType } from './auth.types';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private getSecrets(): { accessSecret: string; refreshSecret: string } {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException(
        'JWT secrets are not configured in server environment variables',
      );
    }
    return { accessSecret, refreshSecret };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async issueTokenPair(user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRoleType;
  }): Promise<AuthTokensResponse> {
    const { accessSecret, refreshSecret } = this.getSecrets();

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign(
      { ...payload, jti: randomUUID() },
      refreshSecret,
      {
        expiresIn: (process.env.JWT_REFRESH_TTL || '7d') as jwt.SignOptions['expiresIn'],
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async register(input: RegisterRequest): Promise<AuthTokensResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const created = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: input.fullName.trim(),
        wallet: {
          create: {
            availableCredits: 0,
            reservedCredits: 0,
          },
        },
      },
    });

    return this.issueTokenPair({
      id: created.id,
      email: created.email,
      fullName: created.fullName,
      role: created.role as UserRoleType,
    });
  }

  async login(input: LoginRequest): Promise<AuthTokensResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokenPair({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRoleType,
    });
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokensResponse> {
    const { refreshSecret } = this.getSecrets();
    let decoded: JwtUserPayload;
    try {
      decoded = jwt.verify(rawRefreshToken, refreshSecret) as JwtUserPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }

    if (stored.userId !== decoded.sub) {
      throw new UnauthorizedException('Refresh token subject mismatch');
    }

    // Rotate refresh token: revoke previous token immediately
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair({
      id: stored.user.id,
      email: stored.user.email,
      fullName: stored.user.fullName,
      role: stored.user.role as UserRoleType,
    });
  }

  async logout(rawRefreshToken: string): Promise<{ revoked: boolean }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const result = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count > 0 };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
