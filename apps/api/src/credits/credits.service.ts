import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreditTopUpRequest, CreditWalletSummary } from '@cineora/contracts';
import { PrismaService } from '../prisma/prisma.service';

export interface CreditMutationInput {
  userId: string;
  amount: number;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletSummary(userId: string): Promise<CreditWalletSummary> {
    const wallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
    });
    if (!wallet) {
      throw new NotFoundException('Credit wallet not found for user');
    }

    return {
      walletId: wallet.id,
      availableCredits: wallet.availableCredits,
      reservedCredits: wallet.reservedCredits,
      recentTransactions: wallet.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        idempotencyKey: tx.idempotencyKey,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        notes: tx.notes,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }

  async topUp(userId: string, input: CreditTopUpRequest) {
    if (input.amount <= 0) {
      throw new BadRequestException('Top-up amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }

      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new NotFoundException('Credit wallet not found');
      }

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: { availableCredits: { increment: input.amount } },
      });

      return tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          notes: input.notes ?? 'Manual/billing credit top-up',
        },
      });
    });
  }

  async reserve(input: CreditMutationInput) {
    if (input.amount <= 0) {
      throw new BadRequestException('Reservation amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }

      const wallet = await tx.creditWallet.findUnique({ where: { userId: input.userId } });
      if (!wallet) {
        throw new NotFoundException('Credit wallet not found');
      }

      if (wallet.availableCredits < input.amount) {
        throw new HttpException(
          {
            message: 'Insufficient available credits to reserve for generation',
            availableCredits: wallet.availableCredits,
            requiredCredits: input.amount,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          availableCredits: { decrement: input.amount },
          reservedCredits: { increment: input.amount },
        },
      });

      return tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'RESERVE',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes ?? 'Reserved for AI generation',
        },
      });
    });
  }

  async settle(input: CreditMutationInput) {
    if (input.amount <= 0) {
      throw new BadRequestException('Settlement amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }

      const wallet = await tx.creditWallet.findUnique({ where: { userId: input.userId } });
      if (!wallet) {
        throw new NotFoundException('Credit wallet not found');
      }

      if (wallet.reservedCredits < input.amount) {
        throw new BadRequestException('Reserved balance is lower than settlement amount');
      }

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          reservedCredits: { decrement: input.amount },
        },
      });

      return tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'SETTLE',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes ?? 'Settled upon successful generation',
        },
      });
    });
  }

  async refund(input: CreditMutationInput) {
    if (input.amount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }

      const wallet = await tx.creditWallet.findUnique({ where: { userId: input.userId } });
      if (!wallet) {
        throw new NotFoundException('Credit wallet not found');
      }

      if (wallet.reservedCredits < input.amount) {
        throw new BadRequestException('Reserved balance is lower than refund amount');
      }

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          reservedCredits: { decrement: input.amount },
          availableCredits: { increment: input.amount },
        },
      });

      return tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes ?? 'Refunded after failed or cancelled generation',
        },
      });
    });
  }
}
