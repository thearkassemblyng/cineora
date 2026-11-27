import {
  AuthTokensResponse,
  CreateCharacterAssetRequest,
  CreateProjectRequest,
  CreateSceneRequest,
  CreditWalletSummary,
  HealthResponse,
  ProviderCapability,
  TriggerRenderRequest,
  TriggerSceneGenerationRequest,
} from '@cineora/contracts';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
).replace(/\/$/, '');

export interface ApiErrorShape {
  error?: {
    statusCode?: number;
    message?: string | string[];
  };
  message?: string;
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null) {
    const shaped = payload as ApiErrorShape;
    const msg = shaped.error?.message ?? shaped.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

export class CineoraWebClient {
  constructor(private readonly getAccessToken: () => string | null) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }
    const token = this.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      throw new Error(extractErrorMessage(parsed, `Request failed with HTTP ${res.status}`));
    }
    return parsed as T;
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  listProviders(): Promise<ProviderCapability[]> {
    return this.request<ProviderCapability[]>('/providers');
  }

  getEnhancementCapabilities(): Promise<Array<{ id: string; label: string; implemented: boolean }>> {
    return this.request('/enhancements/capabilities');
  }

  register(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<AuthTokensResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  login(input: { email: string; password: string }): Promise<AuthTokensResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getWallet(): Promise<CreditWalletSummary> {
    return this.request('/credits/wallet');
  }

  topUpCredits(amount: number, notes?: string) {
    return this.request('/credits/topup', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        idempotencyKey: `web-topup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        notes,
      }),
    });
  }

  listProjects(): Promise<Array<Record<string, unknown>>> {
    return this.request('/projects');
  }

  getProject(projectId: string): Promise<Record<string, unknown>> {
    return this.request(`/projects/${projectId}`);
  }

  createProject(input: CreateProjectRequest): Promise<Record<string, unknown>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateStyleBible(projectId: string, styleBibleNotes: string) {
    return this.request(`/projects/${projectId}/style-bible`, {
      method: 'PATCH',
      body: JSON.stringify({ styleBibleNotes }),
    });
  }

  addCharacter(projectId: string, input: CreateCharacterAssetRequest) {
    return this.request(`/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  createScene(projectId: string, input: CreateSceneRequest) {
    return this.request(`/projects/${projectId}/scenes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  triggerSceneGeneration(
    projectId: string,
    sceneId: string,
    input: TriggerSceneGenerationRequest,
  ) {
    return this.request(`/projects/${projectId}/scenes/${sceneId}/generations`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  reconcileGeneration(generationId: string) {
    return this.request(`/generations/${generationId}/reconcile`, {
      method: 'POST',
    });
  }

  triggerRender(projectId: string, input: TriggerRenderRequest) {
    return this.request(`/projects/${projectId}/renders`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
