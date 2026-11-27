import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@cineora/contracts';
import { extractErrorMessage } from '../lib/api-client';

describe('@cineora/web studio client', () => {
  it('validates API health payloads consumed by the web studio', () => {
    const parsed = HealthResponseSchema.parse({
      service: 'cineora-api',
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });

  it('extracts structured NestJS error messages cleanly', () => {
    expect(
      extractErrorMessage(
        { error: { statusCode: 402, message: 'Insufficient available credits' } },
        'fallback',
      ),
    ).toBe('Insufficient available credits');
  });
});
