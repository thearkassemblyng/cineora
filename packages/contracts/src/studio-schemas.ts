import { z } from 'zod';
import { CreditTransactionTypeSchema } from './enums';

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const AuthTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string(),
    role: z.enum(['CREATOR', 'PRODUCER', 'ADMIN']),
  }),
});
export type AuthTokensResponse = z.infer<typeof AuthTokensResponseSchema>;

export const CreditTopUpRequestSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  idempotencyKey: z.string().min(4).max(128),
  notes: z.string().max(300).optional(),
});
export type CreditTopUpRequest = z.infer<typeof CreditTopUpRequestSchema>;

export const CreditWalletSummarySchema = z.object({
  walletId: z.string(),
  availableCredits: z.number().int().min(0),
  reservedCredits: z.number().int().min(0),
  recentTransactions: z.array(
    z.object({
      id: z.string(),
      type: CreditTransactionTypeSchema,
      amount: z.number().int().positive(),
      idempotencyKey: z.string(),
      referenceType: z.string().nullable(),
      referenceId: z.string().nullable(),
      notes: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});
export type CreditWalletSummary = z.infer<typeof CreditWalletSummarySchema>;

export const CreateCharacterAssetRequestSchema = z.object({
  name: z.string().min(1).max(120),
  appearanceNotes: z.string().min(5).max(2000),
  wardrobeNotes: z.string().max(1000).optional(),
  referenceImageUrl: z.string().url().optional(),
});
export type CreateCharacterAssetRequest = z.infer<typeof CreateCharacterAssetRequestSchema>;

export const UpdateStyleBibleRequestSchema = z.object({
  styleBibleNotes: z.string().max(4000),
});
export type UpdateStyleBibleRequest = z.infer<typeof UpdateStyleBibleRequestSchema>;

export const PresignUploadRequestSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
  folder: z.enum(['characters', 'scenes', 'audio', 'renders']).default('characters'),
});
export type PresignUploadRequest = z.infer<typeof PresignUploadRequestSchema>;
