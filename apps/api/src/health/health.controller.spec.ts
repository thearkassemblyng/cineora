import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@cineora/contracts';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns a valid contract-compliant health payload', () => {
    const controller = new HealthController(new HealthService());
    const result = controller.check();

    const parsed = HealthResponseSchema.parse(result);
    expect(parsed.service).toBe('cineora-api');
    expect(parsed.status).toBe('ok');
  });
});
