'use client';

import { useState } from 'react';
import {
  AspectRatio,
  CameraMovement,
  ExportPreset,
  GenerationMode,
  LightingPreset,
  ProjectFormat,
  QualityTier,
  ResolutionPreset,
  ShotType,
} from '@cineora/contracts';
import { CineoraWebClient } from '../lib/api-client';

interface SceneRecord {
  id: string;
  orderIndex: number;
  title: string;
  visualPrompt: string;
  shotType: string;
  cameraMovement: string;
  lightingPreset: string;
  durationSeconds: number;
  activeGenerationId: string | null;
  generations?: Array<{
    id: string;
    mode: string;
    provider: string;
    model: string;
    status: string;
    errorMessage: string | null;
    qualityReport?: {
      passed: boolean;
      sharpnessScore: number;
      flickerScore: number;
      artifactFlags: string[];
    } | null;
  }>;
}

interface ProjectDetail {
  id: string;
  title: string;
  format: string;
  aspectRatio: string;
  targetResolution: string;
  targetFps: number;
  styleBibleNotes: string | null;
  characters?: Array<{ id: string; name: string; appearanceNotes: string }>;
  scenes?: SceneRecord[];
  renders?: Array<{ id: string; exportPreset: string; status: string; progressPct: number }>;
}

interface ProjectWorkspaceProps {
  client: CineoraWebClient;
  projects: Array<{ id: string; title: string; format: string; targetResolution: string }>;
  selectedProject: ProjectDetail | null;
  onRefreshProjects: (selectId?: string) => Promise<void>;
  onSelectProject: (projectId: string) => Promise<void>;
  onWalletUpdated: () => Promise<void>;
}

export function ProjectWorkspace({
  client,
  projects,
  selectedProject,
  onRefreshProjects,
  onSelectProject,
  onWalletUpdated,
}: ProjectWorkspaceProps) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<ProjectFormat>('CINEMATIC_FILM');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [targetResolution, setTargetResolution] = useState<ResolutionPreset>('1080P');

  const [sceneTitle, setSceneTitle] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [shotType, setShotType] = useState<ShotType>('MEDIUM');
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('TRACKING');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('NATURAL_GOLDEN_HOUR');
  const [durationSeconds, setDurationSeconds] = useState(5);

  const [genMode, setGenMode] = useState<GenerationMode>('DEMO');
  const [qualityTier, setQualityTier] = useState<QualityTier>('HIGH');
  const [exportPreset, setExportPreset] = useState<ExportPreset>('WEB_MASTER');

  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setBusyMessage('Creating production project…');
    setFeedback(null);
    try {
      const created = (await client.createProject({
        title,
        format,
        aspectRatio,
        targetResolution,
        targetFps: 24,
        colorProfile: targetResolution === '4K' ? 'BT2020_HDR' : 'REC709_FILMIC',
      })) as { id: string };
      setTitle('');
      await onRefreshProjects(created.id);
      setFeedback({ type: 'success', text: 'Production project created.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create project',
      });
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleAddScene(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;
    setBusyMessage('Adding scene to storyboard…');
    setFeedback(null);
    try {
      await client.createScene(selectedProject.id, {
        orderIndex: selectedProject.scenes?.length ?? 0,
        title: sceneTitle,
        visualPrompt,
        shotType,
        cameraMovement,
        lightingPreset,
        durationSeconds,
      });
      setSceneTitle('');
      setVisualPrompt('');
      await onSelectProject(selectedProject.id);
      setFeedback({ type: 'success', text: 'Scene added to storyboard.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to add scene',
      });
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleGenerateScene(sceneId: string) {
    if (!selectedProject) return;
    setBusyMessage(`Dispatching ${genMode} generation (${qualityTier})…`);
    setFeedback(null);
    try {
      const res = (await client.triggerSceneGeneration(selectedProject.id, sceneId, {
        mode: genMode,
        qualityTier,
        requiresLipSync: false,
        requiresNativeAudio: false,
      })) as { notice?: string | null; generation?: { status?: string; errorMessage?: string | null } };
      await onSelectProject(selectedProject.id);
      await onWalletUpdated();
      const errMsg = res.generation?.errorMessage;
      setFeedback({
        type: errMsg ? 'error' : 'success',
        text: errMsg || res.notice || `Generation status: ${res.generation?.status ?? 'QUEUED'}`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Generation failed',
      });
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleTriggerRender() {
    if (!selectedProject) return;
    setBusyMessage(`Queueing ${exportPreset} FFmpeg master render…`);
    setFeedback(null);
    try {
      await client.triggerRender(selectedProject.id, {
        exportPreset,
        loudnessTargetLufs: exportPreset === 'BROADCAST_1080P' ? -23 : -14,
      });
      await onSelectProject(selectedProject.id);
      setFeedback({ type: 'success', text: `${exportPreset} render job queued.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Render validation failed',
      });
    } finally {
      setBusyMessage(null);
    }
  }

  return (
    <div className="stack-lg">
      {busyMessage && <div className="alert alert-info">{busyMessage}</div>}
      {feedback && (
        <div
          className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}
          role="status"
        >
          {feedback.text}
        </div>
      )}

      <div className="two-col">
        <section className="card">
          <h2>New Production Project</h2>
          <form onSubmit={handleCreateProject} className="stack">
            <label className="field">
              <span>Project Title</span>
              <input
                required
                minLength={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Midnight Horology Commercial"
              />
            </label>
            <div className="two-col-tight">
              <label className="field">
                <span>Format</span>
                <select value={format} onChange={(e) => setFormat(e.target.value as ProjectFormat)}>
                  <option value="CINEMATIC_FILM">Cinematic Film</option>
                  <option value="ADVERTISEMENT">Advertisement</option>
                  <option value="NEWS_BROADCAST">News Broadcast</option>
                  <option value="DOCUMENTARY">Documentary</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </label>
              <label className="field">
                <span>Resolution</span>
                <select
                  value={targetResolution}
                  onChange={(e) => setTargetResolution(e.target.value as ResolutionPreset)}
                >
                  <option value="1080P">Full HD (1080p)</option>
                  <option value="4K">Ultra HD (4K)</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Aspect Ratio</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              >
                <option value="16:9">16:9 Widescreen</option>
                <option value="2.39:1">2.39:1 Anamorphic Cinema</option>
                <option value="9:16">9:16 Vertical Social</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </label>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Your Productions ({projects.length})</h2>
          {projects.length === 0 ? (
            <p className="muted">No projects yet. Create your first cinematic production on the left.</p>
          ) : (
            <div className="stack">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`project-item ${selectedProject?.id === p.id ? 'active' : ''}`}
                  onClick={() => onSelectProject(p.id)}
                >
                  <strong>{p.title}</strong>
                  <span className="muted">
                    {p.format} · {p.targetResolution}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedProject && (
        <section className="card stack-lg">
          <div className="row-between">
            <div>
              <h2>{selectedProject.title} — Storyboard & Scene Studio</h2>
              <p className="muted">
                {selectedProject.format} · {selectedProject.aspectRatio} ·{' '}
                {selectedProject.targetResolution} · {selectedProject.targetFps}fps
              </p>
            </div>
            <div className="controls-inline">
              <select
                aria-label="Generation Mode"
                value={genMode}
                onChange={(e) => setGenMode(e.target.value as GenerationMode)}
              >
                <option value="DEMO">DEMO Mode (Dry-Run)</option>
                <option value="LIVE">LIVE Provider Generation</option>
              </select>
              <select
                aria-label="Quality Tier"
                value={qualityTier}
                onChange={(e) => setQualityTier(e.target.value as QualityTier)}
              >
                <option value="STANDARD">Standard Quality</option>
                <option value="HIGH">High Quality</option>
                <option value="CINEMA_MASTER">Cinema Master</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleAddScene} className="subcard stack">
            <strong>Add Scene to Storyboard</strong>
            <div className="two-col-tight">
              <label className="field">
                <span>Scene Title</span>
                <input
                  required
                  value={sceneTitle}
                  onChange={(e) => setSceneTitle(e.target.value)}
                  placeholder="Scene 1 — Establishing Skyline"
                />
              </label>
              <label className="field">
                <span>Duration (seconds)</span>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="three-col-tight">
              <label className="field">
                <span>Shot Type</span>
                <select value={shotType} onChange={(e) => setShotType(e.target.value as ShotType)}>
                  <option value="ESTABLISHING">Establishing</option>
                  <option value="WIDE">Wide</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="CLOSE_UP">Close-Up</option>
                  <option value="AERIAL">Aerial</option>
                </select>
              </label>
              <label className="field">
                <span>Camera Movement</span>
                <select
                  value={cameraMovement}
                  onChange={(e) => setCameraMovement(e.target.value as CameraMovement)}
                >
                  <option value="TRACKING">Tracking</option>
                  <option value="DOLLY_IN">Dolly In</option>
                  <option value="CRANE">Crane</option>
                  <option value="DRONE_ORBIT">Drone Orbit</option>
                  <option value="STATIC">Static</option>
                </select>
              </label>
              <label className="field">
                <span>Lighting Preset</span>
                <select
                  value={lightingPreset}
                  onChange={(e) => setLightingPreset(e.target.value as LightingPreset)}
                >
                  <option value="NATURAL_GOLDEN_HOUR">Golden Hour</option>
                  <option value="CINEMATIC_CHIAROSCURO">Chiaroscuro</option>
                  <option value="STUDIO_SOFTBOX">Studio Softbox</option>
                  <option value="NEON_NOIR">Neon Noir</option>
                  <option value="HIGH_KEY_COMMERCIAL">High-Key Commercial</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Cinematic Visual Prompt</span>
              <textarea
                required
                minLength={10}
                rows={3}
                value={visualPrompt}
                onChange={(e) => setVisualPrompt(e.target.value)}
                placeholder="Describe subject, motion, texture, lighting, and atmosphere in detail…"
              />
            </label>
            <button type="submit" className="btn-primary">
              Add Scene
            </button>
          </form>

          <div className="stack">
            {(selectedProject.scenes ?? []).length === 0 ? (
              <p className="muted">No scenes yet. Add your first shot above to begin generating.</p>
            ) : (
              (selectedProject.scenes ?? []).map((scene) => (
                <article key={scene.id} className="subcard stack">
                  <div className="row-between">
                    <div>
                      <strong>
                        #{scene.orderIndex + 1} · {scene.title}
                      </strong>
                      <div className="muted">
                        {scene.shotType} · {scene.cameraMovement} · {scene.lightingPreset} ·{' '}
                        {scene.durationSeconds}s
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleGenerateScene(scene.id)}
                    >
                      {(scene.generations?.length ?? 0) > 0
                        ? `Regenerate Scene (${genMode})`
                        : `Generate Scene (${genMode})`}
                    </button>
                  </div>
                  <p>{scene.visualPrompt}</p>

                  {scene.generations && scene.generations.length > 0 && (
                    <div className="stack">
                      {scene.generations.map((g) => (
                        <div key={g.id} className="take-row">
                          <span>
                            <span className={`pill ${g.mode === 'LIVE' ? 'pill-live' : 'pill-warn'}`}>
                              {g.mode}
                            </span>{' '}
                            Take · <strong>{g.status}</strong>
                            {g.errorMessage && <span className="status-error"> — {g.errorMessage}</span>}
                          </span>
                          {g.qualityReport && (
                            <span className={`pill ${g.qualityReport.passed ? 'pill-live' : 'pill-err'}`}>
                              QC {g.qualityReport.passed ? 'PASS' : 'REVIEW'} (Sharpness{' '}
                              {g.qualityReport.sharpnessScore})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          <div className="subcard row-between">
            <div>
              <strong>Quality-Preserving FFmpeg Export Studio</strong>
              <p className="muted">
                Assembles all active scene takes with EBU R128 loudness mastering and preserved color
                space.
              </p>
            </div>
            <div className="controls-inline">
              <select
                aria-label="Export Preset"
                value={exportPreset}
                onChange={(e) => setExportPreset(e.target.value as ExportPreset)}
              >
                <option value="CINEMA_4K">Cinema 4K (10-bit HEVC)</option>
                <option value="BROADCAST_1080P">Broadcast 1080p (-23 LUFS)</option>
                <option value="WEB_MASTER">Web Master 1080p (-14 LUFS)</option>
                <option value="SOCIAL_9_16">Social Vertical 9:16</option>
              </select>
              <button type="button" className="btn-primary" onClick={handleTriggerRender}>
                Queue Master Render
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
