import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@cineora/contracts';

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      service: 'cineora-api',
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: process.env.DATABASE_URL ? 'up' : 'unconfigured',
        redis: process.env.REDIS_HOST ? 'up' : 'unconfigured',
        aiOrchestrator: process.env.AI_ORCHESTRATOR_URL ? 'up' : 'unconfigured',
      },
    };
  }
}
