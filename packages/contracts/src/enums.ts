import { z } from 'zod';

export const GenerationModeSchema = z.enum(['LIVE', 'DEMO']);
export type GenerationMode = z.infer<typeof GenerationModeSchema>;

export const QualityTierSchema = z.enum(['STANDARD', 'HIGH', 'CINEMA_MASTER']);
export type QualityTier = z.infer<typeof QualityTierSchema>;

export const ResolutionPresetSchema = z.enum(['1080P', '4K']);
export type ResolutionPreset = z.infer<typeof ResolutionPresetSchema>;

export const AspectRatioSchema = z.enum(['16:9', '9:16', '2.39:1', '1:1', '4:5']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const ProjectFormatSchema = z.enum([
  'CINEMATIC_FILM',
  'ADVERTISEMENT',
  'NEWS_BROADCAST',
  'DOCUMENTARY',
  'SOCIAL_MEDIA',
]);
export type ProjectFormat = z.infer<typeof ProjectFormatSchema>;

export const ShotTypeSchema = z.enum([
  'WIDE',
  'MEDIUM',
  'CLOSE_UP',
  'EXTREME_CLOSE_UP',
  'ESTABLISHING',
  'OVER_THE_SHOULDER',
  'AERIAL',
  'LOW_ANGLE',
  'HIGH_ANGLE',
]);
export type ShotType = z.infer<typeof ShotTypeSchema>;

export const CameraMovementSchema = z.enum([
  'STATIC',
  'PAN',
  'TILT',
  'DOLLY_IN',
  'DOLLY_OUT',
  'TRACKING',
  'CRANE',
  'HANDHELD_SUBTLE',
  'DRONE_ORBIT',
]);
export type CameraMovement = z.infer<typeof CameraMovementSchema>;

export const LightingPresetSchema = z.enum([
  'NATURAL_GOLDEN_HOUR',
  'CINEMATIC_CHIAROSCURO',
  'STUDIO_SOFTBOX',
  'NEON_NOIR',
  'OVERCAST_DIFFUSED',
  'HIGH_KEY_COMMERCIAL',
]);
export type LightingPreset = z.infer<typeof LightingPresetSchema>;

export const GenerationStatusSchema = z.enum([
  'QUEUED',
  'DISPATCHED',
  'PROCESSING',
  'QC_PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;

export const ExportPresetSchema = z.enum([
  'CINEMA_4K',
  'BROADCAST_1080P',
  'WEB_MASTER',
  'SOCIAL_9_16',
]);
export type ExportPreset = z.infer<typeof ExportPresetSchema>;

export const CreditTransactionTypeSchema = z.enum([
  'TOPUP',
  'RESERVE',
  'SETTLE',
  'REFUND',
]);
export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>;
