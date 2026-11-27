import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ProviderCapability } from '@cineora/contracts';

export interface OrchestratorDispatchPayload {
  mode: 'LIVE' | 'DEMO';
  qualityTier: 'STANDARD' | 'HIGH' | 'CINEMA_MASTER';
  targetResolution: '1080P' | '4K';
  aspectRatio: string;
  durationSeconds: number;
  preferredProvider?: string;
  preferredModel?: string;
  requiresLipSync: boolean;
  requiresNativeAudio: boolean;
  seed?: number;
  visualPrompt: string;
  shotType: string;
  cameraMovement: string;
  lightingPreset: string;
  colorProfile: string;
  styleBibleNotes?: string | null;
  continuityNotes?: string | null;
  characters: Array<{
    name: string;
    appearanceNotes: string;
    wardrobeNotes?: string | null;
    referenceImageUrl?: string | null;
  }>;
}

export interface OrchestratorDispatchResult {
  mode: 'LIVE' | 'DEMO';
  isSimulated: boolean;
  provider: string;
  model: string;
  providerJobId: string;
  status: 'DISPATCHED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  compiledPrompt: string;
  negativePrompt: string;
  notice?: string | null;
}

export interface OrchestratorPollResult {
  providerJobId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputUrl: string | null;
  errorMessage: string | null;
}

@Injectable()
export class OrchestratorClient {
  private get baseUrl(): string {
    return (process.env.AI_ORCHESTRATOR_URL || 'http://localhost:8000').replace(/\/$/, '');
  }

  async listProviders(): Promise<ProviderCapability[]> {
    const res = await fetch(`${this.baseUrl}/v1/providers`);
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `AI Orchestrator returned HTTP ${res.status} while listing providers`,
      );
    }
    return (await res.json()) as ProviderCapability[];
  }

  async dispatchGeneration(
    payload: OrchestratorDispatchPayload,
  ): Promise<OrchestratorDispatchResult> {
    const res = await fetch(`${this.baseUrl}/v1/generations/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Orchestrator dispatch failed (${res.status}): ${text}`);
    }
    return (await res.json()) as OrchestratorDispatchResult;
  }

  async pollGeneration(
    providerId: string,
    providerJobId: string,
  ): Promise<OrchestratorPollResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/generations/${encodeURIComponent(providerId)}/${encodeURIComponent(providerJobId)}`,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Orchestrator poll failed (${res.status}): ${text}`);
    }
    return (await res.json()) as OrchestratorPollResult;
  }
}
