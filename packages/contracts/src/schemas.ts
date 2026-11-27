import { z } from 'zod';
import {
  AspectRatioSchema,
  CameraMovementSchema,
  ExportPresetSchema,
  GenerationModeSchema,
  GenerationStatusSchema,
  LightingPresetSchema,
  ProjectFormatSchema,
  QualityTierSchema,
  ResolutionPresetSchema,
  ShotTypeSchema,
} from './enums';

export const CreateProjectRequestSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(2000).optional(),
  format: ProjectFormatSchema.default('CINEMATIC_FILM'),
  aspectRatio: AspectRatioSchema.default('16:9'),
  targetResolution: ResolutionPresetSchema.default('1080P'),
  targetFps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(24),
  colorProfile: z.enum(['BT709', 'BT2020_HDR', 'REC709_FILMIC']).default('REC709_FILMIC'),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const CreateSceneRequestSchema = z.object({
  orderIndex: z.number().int().min(0),
  title: z.string().min(1).max(140),
  scriptNarration: z.string().max(4000).optional(),
  visualPrompt: z.string().min(10).max(4000),
  shotType: ShotTypeSchema.default('MEDIUM'),
  cameraMovement: CameraMovementSchema.default('TRACKING'),
  lightingPreset: LightingPresetSchema.default('NATURAL_GOLDEN_HOUR'),
  durationSeconds: z.number().int().min(2).max(30).default(5),
  continuityNotes: z.string().max(1500).optional(),
});
export type CreateSceneRequest = z.infer<typeof CreateSceneRequestSchema>;

export const TriggerSceneGenerationRequestSchema = z.object({
  mode: GenerationModeSchema.default('LIVE'),
  qualityTier: QualityTierSchema.default('HIGH'),
  preferredProvider: z.string().min(2).max(64).optional(),
  preferredModel: z.string().min(2).max(120).optional(),
  requiresLipSync: z.boolean().default(false),
  requiresNativeAudio: z.boolean().default(false),
  seed: z.number().int().min(0).optional(),
});
export type TriggerSceneGenerationRequest = z.infer<typeof TriggerSceneGenerationRequestSchema>;

export const QualityReportSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  sharpnessScore: z.number().min(0).max(100),
  flickerScore: z.number().min(0).max(100),
  avSyncOffsetMs: z.number(),
  artifactFlags: z.array(z.string()),
  passed: z.boolean(),
  recommendations: z.array(z.string()),
  analyzedAt: z.string().datetime(),
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

export const ProviderCapabilitySchema = z.object({
  providerId: z.string(),
  displayName: z.string(),
  modelId: z.string(),
  configured: z.boolean(),
  maxResolution: ResolutionPresetSchema,
  supportedAspectRatios: z.array(AspectRatioSchema),
  maxDurationSeconds: z.number().int().positive(),
  supportsLipSync: z.boolean(),
  supportsNativeAudio: z.boolean(),
  supportsCharacterReference: z.boolean(),
  visualQualityScore: z.number().min(1).max(100),
  realismScore: z.number().min(1).max(100),
  motionQualityScore: z.number().min(1).max(100),
  speedTier: z.enum(['FAST', 'BALANCED', 'CINEMA_SLOW']),
  creditsPerSecond: z.number().positive(),
  limitations: z.array(z.string()),
});
export type ProviderCapability = z.infer<typeof ProviderCapabilitySchema>;

export const TriggerRenderRequestSchema = z.object({
  exportPreset: ExportPresetSchema.default('WEB_MASTER'),
  loudnessTargetLufs: z.union([z.literal(-14), z.literal(-16), z.literal(-23)]).default(-14),
});
export type TriggerRenderRequest = z.infer<typeof TriggerRenderRequestSchema>;

export const HealthResponseSchema = z.object({
  service: z.string(),
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  timestamp: z.string().datetime(),
  dependencies: z.record(z.string(), z.enum(['up', 'down', 'unconfigured'])).optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const GenerationSummarySchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  mode: GenerationModeSchema,
  provider: z.string(),
  model: z.string(),
  qualityTier: QualityTierSchema,
  status: GenerationStatusSchema,
  providerJobId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type GenerationSummary = z.infer<typeof GenerationSummarySchema>;
