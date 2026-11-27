import { spawnSync } from 'node:child_process';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { evaluateFfprobeQuality, probeMediaFile } from './qc/analyzer';
import { buildProjectAssemblyArgs } from './ffmpeg/enhancements';
import { MEDIA_QUEUES, ProjectRenderJobPayload, SceneQcJobPayload } from './queues';

export function checkFfmpegAvailable(binary = process.env.FFMPEG_PATH || 'ffmpeg'): boolean {
  const result = spawnSync(binary, ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

function startWorkers(): void {
  const ffmpegAvailable = checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    console.warn(
      '[cineora-media-worker] WARNING: ffmpeg binary not found on PATH. Install FFmpeg or run via Docker.',
    );
  }

  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });

  const concurrency = Number(process.env.MEDIA_WORKER_CONCURRENCY || 2);

  new Worker<SceneQcJobPayload>(
    MEDIA_QUEUES.SCENE_QC,
    async (job) => {
      const probe = probeMediaFile(job.data.sourceAssetKey);
      const report = evaluateFfprobeQuality(probe, {
        expectedWidth: job.data.expectedWidth,
        expectedHeight: job.data.expectedHeight,
        expectedFps: job.data.expectedFps,
      });
      return {
        generationId: job.data.generationId,
        report,
      };
    },
    { connection, concurrency },
  );

  new Worker<ProjectRenderJobPayload>(
    MEDIA_QUEUES.PROJECT_RENDER,
    async (job) => {
      const ffmpegBinary = process.env.FFMPEG_PATH || 'ffmpeg';
      if (!checkFfmpegAvailable(ffmpegBinary)) {
        throw new Error('FFmpeg binary is required on the worker to assemble project renders.');
      }
      const args = buildProjectAssemblyArgs({
        concatListPath: job.data.sceneAssetKeys[0] || '',
        outputPath: `${process.env.TEMP_MEDIA_DIR || './tmp'}/${job.data.renderJobId}.mp4`,
        exportPreset: job.data.exportPreset,
        loudnessTargetLufs: job.data.loudnessTargetLufs,
      });
      return {
        renderJobId: job.data.renderJobId,
        preparedFfmpegArgs: args,
      };
    },
    { connection, concurrency },
  );

  console.log('[cineora-media-worker] Listening on BullMQ queues:', Object.values(MEDIA_QUEUES));
}

if (require.main === module) {
  startWorkers();
}
