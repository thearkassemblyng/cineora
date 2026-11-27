import { spawnSync } from 'node:child_process';

export interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
  duration?: string;
  pix_fmt?: string;
  color_space?: string;
}

export interface FfprobeOutput {
  format?: {
    duration?: string;
    bit_rate?: string;
  };
  streams?: FfprobeStream[];
}

export interface QcTargetSpec {
  expectedWidth: number;
  expectedHeight: number;
  expectedFps: number;
  minBitrateKbps?: number;
  maxAvSyncOffsetMs?: number;
  measuredSharpnessScore?: number;
  measuredFlickerScore?: number;
}

export interface QcEvaluationResult {
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  sharpnessScore: number;
  flickerScore: number;
  avSyncOffsetMs: number;
  artifactFlags: string[];
  passed: boolean;
  recommendations: string[];
}

export function parseFrameRate(raw?: string): number {
  if (!raw) return 0;
  if (raw.includes('/')) {
    const [numStr, denStr] = raw.split('/');
    const num = Number(numStr);
    const den = Number(denStr);
    if (den > 0 && Number.isFinite(num)) {
      return Number((num / den).toFixed(3));
    }
    return 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : 0;
}

export function evaluateFfprobeQuality(
  probe: FfprobeOutput,
  target: QcTargetSpec,
): QcEvaluationResult {
  const streams = probe.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');

  const artifactFlags: string[] = [];
  const recommendations: string[] = [];

  if (!videoStream) {
    return {
      width: 0,
      height: 0,
      fps: 0,
      bitrateKbps: 0,
      sharpnessScore: 0,
      flickerScore: 0,
      avSyncOffsetMs: 0,
      artifactFlags: ['MISSING_VIDEO_STREAM'],
      passed: false,
      recommendations: ['Regenerate this scene; no valid video stream was detected.'],
    };
  }

  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  const fps = parseFrameRate(videoStream.avg_frame_rate || videoStream.r_frame_rate);
  const rawBitrate = Number(videoStream.bit_rate || probe.format?.bit_rate || 0);
  const bitrateKbps = Math.round(rawBitrate / 1000);

  const videoDuration = Number(videoStream.duration || probe.format?.duration || 0);
  const audioDuration = audioStream ? Number(audioStream.duration || videoDuration) : videoDuration;
  const avSyncOffsetMs = Math.round(Math.abs(videoDuration - audioDuration) * 1000);

  const minBitrate = target.minBitrateKbps ?? (target.expectedWidth >= 3840 ? 18000 : 5000);
  const maxAvDrift = target.maxAvSyncOffsetMs ?? 80;
  const sharpnessScore = target.measuredSharpnessScore ?? 85;
  const flickerScore = target.measuredFlickerScore ?? 92;

  if (width < target.expectedWidth || height < target.expectedHeight) {
    artifactFlags.push('RESOLUTION_BELOW_TARGET');
    recommendations.push(
      `Source is ${width}x${height}, below requested ${target.expectedWidth}x${target.expectedHeight}. Regenerate with a higher-resolution model or apply Lanczos upscaling.`,
    );
  }

  if (fps > 0 && Math.abs(fps - target.expectedFps) > 1.5) {
    artifactFlags.push('FPS_MISMATCH');
    recommendations.push(
      `Frame rate (${fps} fps) differs from project target (${target.expectedFps} fps).`,
    );
  }

  if (bitrateKbps > 0 && bitrateKbps < minBitrate) {
    artifactFlags.push('LOW_BITRATE_COMPRESSION');
    recommendations.push(
      `Bitrate (${bitrateKbps} kbps) is below cinema clarity threshold (${minBitrate} kbps); visual compression artifacts may appear.`,
    );
  }

  if (audioStream && avSyncOffsetMs > maxAvDrift) {
    artifactFlags.push('AV_SYNC_DRIFT');
    recommendations.push(
      `Audio/video duration drift (${avSyncOffsetMs} ms) exceeds ${maxAvDrift} ms tolerance; re-sync audio track before export.`,
    );
  }

  if (sharpnessScore < 65) {
    artifactFlags.push('LOW_SHARPNESS_BLUR');
    recommendations.push(
      'Detected soft or blurry frames. Regenerate this scene with stricter focus and lighting cues.',
    );
  }

  if (flickerScore < 70) {
    artifactFlags.push('TEMPORAL_FLICKER');
    recommendations.push(
      'Detected temporal frame flicker. Apply FFmpeg denoising or regenerate scene with steadier camera motion.',
    );
  }

  return {
    width,
    height,
    fps,
    bitrateKbps,
    sharpnessScore,
    flickerScore,
    avSyncOffsetMs,
    artifactFlags,
    passed: artifactFlags.length === 0,
    recommendations,
  };
}

export function probeMediaFile(
  filePath: string,
  ffprobeBinary = process.env.FFPROBE_PATH || 'ffprobe',
): FfprobeOutput {
  const result = spawnSync(
    ffprobeBinary,
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { encoding: 'utf8' },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `ffprobe failed for ${filePath}: ${result.error?.message || result.stderr || 'ffprobe unavailable'}`,
    );
  }
  return JSON.parse(result.stdout) as FfprobeOutput;
}
