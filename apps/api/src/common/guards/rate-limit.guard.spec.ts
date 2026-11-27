import { describe, expect, it } from 'vitest';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function makeContext(ip: string, path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, path }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows requests within threshold and blocks with 429 when exceeded', () => {
    const guard = new RateLimitGuard(2, 60_000);
    const ctx = makeContext('127.0.0.1', '/api/v1/auth/login');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);

    try {
      guard.canActivate(ctx);
      expect.fail('Expected 429 HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
