import { ExportPreset } from '@cineora/contracts';

export const MEDIA_QUEUES = {
  SCENE_QC: 'cineora:scene-qc',
  SCENE_ENHANCE: 'cineora:scene-enhance',
  PROJECT_RENDER: 'cineora:project-render',
} as const;

export interface SceneQcJobPayload {
  generationId: string;
  sourceAssetKey: string;
  expectedWidth: number;
  expectedHeight: number;
  expectedFps: number;
}

export interface ProjectRenderJobPayload {
  renderJobId: string;
  projectId: string;
  exportPreset: ExportPreset;
  loudnessTargetLufs: -14 | -16 | -23;
  sceneAssetKeys: string[];
}
