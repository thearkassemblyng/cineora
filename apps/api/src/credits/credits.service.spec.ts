import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CreditsService (Double-Entry Ledger)', () => {
  let walletState: { id: string; userId: string; availableCredits: number; reservedCredits: number };
  let transactions: Map<string, Record<string, unknown>>;

  const prismaMock = {
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        creditWallet: {
          findUnique: vi.fn(async ({ where }: { where: { userId: string } }) =>
            where.userId === walletState.userId ? { ...walletState } : null,
          ),
          update: vi.fn(
            async ({
              data,
            }: {
              data: {
                availableCredits?: { increment?: number; decrement?: number };
                reservedCredits?: { increment?: number; decrement?: number };
              };
            }) => {
              if (data.availableCredits?.increment) {
                walletState.availableCredits += data.availableCredits.increment;
              }
              if (data.availableCredits?.decrement) {
                walletState.availableCredits -= data.availableCredits.decrement;
              }
              if (data.reservedCredits?.increment) {
                walletState.reservedCredits += data.reservedCredits.increment;
              }
              if (data.reservedCredits?.decrement) {
                walletState.reservedCredits -= data.reservedCredits.decrement;
              }
              return { ...walletState };
            },
          ),
        },
        creditTransaction: {
          findUnique: vi.fn(async ({ where }: { where: { idempotencyKey: string } }) =>
            transactions.get(where.idempotencyKey) ?? null,
          ),
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            const record = { id: `tx_${transactions.size + 1}`, ...data };
            transactions.set(String(data.idempotencyKey), record);
            return record;
          }),
        },
      }),
    ),
  };

  let service: CreditsService;

  beforeEach(() => {
    walletState = { id: 'wallet_1', userId: 'user_1', availableCredits: 100, reservedCredits: 0 };
    transactions = new Map();
    service = new CreditsService(prismaMock as unknown as PrismaService);
  });

  it('reserves credits atomically and settles them on success', async () => {
    await service.reserve({
      userId: 'user_1',
      amount: 40,
      idempotencyKey: 'gen-1-reserve',
      referenceType: 'GENERATION',
      referenceId: 'gen_1',
    });

    expect(walletState.availableCredits).toBe(60);
    expect(walletState.reservedCredits).toBe(40);

    await service.settle({
      userId: 'user_1',
      amount: 40,
      idempotencyKey: 'gen-1-settle',
      referenceType: 'GENERATION',
      referenceId: 'gen_1',
    });

    expect(walletState.availableCredits).toBe(60);
    expect(walletState.reservedCredits).toBe(0);
  });

  it('refunds reserved credits back to available balance on failure', async () => {
    await service.reserve({
      userId: 'user_1',
      amount: 55,
      idempotencyKey: 'gen-2-reserve',
    });
    expect(walletState.availableCredits).toBe(45);
    expect(walletState.reservedCredits).toBe(55);

    await service.refund({
      userId: 'user_1',
      amount: 55,
      idempotencyKey: 'gen-2-refund',
    });
    expect(walletState.availableCredits).toBe(100);
    expect(walletState.reservedCredits).toBe(0);
  });

  it('enforces idempotency on duplicate reserve calls', async () => {
    const first = await service.reserve({
      userId: 'user_1',
      amount: 30,
      idempotencyKey: 'dup-key',
    });
    const second = await service.reserve({
      userId: 'user_1',
      amount: 30,
      idempotencyKey: 'dup-key',
    });

    expect(first).toEqual(second);
    expect(walletState.availableCredits).toBe(70);
    expect(walletState.reservedCredits).toBe(30);
  });

  it('throws 402 Payment Required when available credits are insufficient', async () => {
    try {
      await service.reserve({
        userId: 'user_1',
        amount: 250,
        idempotencyKey: 'too-expensive',
      });
      expect.fail('Expected HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    }
    expect(walletState.availableCredits).toBe(100);
    expect(walletState.reservedCredits).toBe(0);
  });
});
