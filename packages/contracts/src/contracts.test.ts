import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequestSchema,
  CreateSceneRequestSchema,
  TriggerSceneGenerationRequestSchema,
} from './schemas';

describe('@cineora/contracts', () => {
  it('validates a cinematic project payload with sensible defaults', () => {
    const parsed = CreateProjectRequestSchema.parse({
      title: 'Midnight Neon Commercial',
    });

    expect(parsed.format).toBe('CINEMATIC_FILM');
    expect(parsed.aspectRatio).toBe('16:9');
    expect(parsed.targetResolution).toBe('1080P');
    expect(parsed.targetFps).toBe(24);
  });

  it('rejects scenes with overly short visual prompts', () => {
    const result = CreateSceneRequestSchema.safeParse({
      orderIndex: 0,
      title: 'Opening Shot',
      visualPrompt: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('explicitly separates LIVE and DEMO generation modes', () => {
    const liveReq = TriggerSceneGenerationRequestSchema.parse({});
    const demoReq = TriggerSceneGenerationRequestSchema.parse({
      mode: 'DEMO',
      qualityTier: 'CINEMA_MASTER',
    });

    expect(liveReq.mode).toBe('LIVE');
    expect(demoReq.mode).toBe('DEMO');
    expect(demoReq.qualityTier).toBe('CINEMA_MASTER');
  });
});
