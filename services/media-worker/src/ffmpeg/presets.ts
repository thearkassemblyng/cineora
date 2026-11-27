import { ExportPreset } from '@cineora/contracts';

export interface FfmpegExportProfile {
  preset: ExportPreset;
  videoCodec: 'libx265' | 'libx264';
  crf: number;
  encoderPreset: 'slow' | 'medium';
  pixelFormat: 'yuv420p10le' | 'yuv420p';
  colorPrimaries: 'bt2020' | 'bt709';
  colorTrc: 'smpte2084' | 'bt709';
  colorSpace: 'bt2020nc' | 'bt709';
  audioCodec: 'aac';
  audioBitrateKbps: number;
  audioSampleRateHz: 48000;
  defaultLoudnessLufs: -14 | -16 | -23;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Quality-preserving FFmpeg encoding configurations.
 * Designed to avoid unnecessary compression artifacts, color washout, or audio degradation.
 */
export const FFMPEG_EXPORT_PROFILES: Record<ExportPreset, FfmpegExportProfile> = {
  CINEMA_4K: {
    preset: 'CINEMA_4K',
    videoCodec: 'libx265',
    crf: 16,
    encoderPreset: 'slow',
    pixelFormat: 'yuv420p10le',
    colorPrimaries: 'bt2020',
    colorTrc: 'smpte2084',
    colorSpace: 'bt2020nc',
    audioCodec: 'aac',
    audioBitrateKbps: 320,
    audioSampleRateHz: 48000,
    defaultLoudnessLufs: -16,
    maxWidth: 3840,
    maxHeight: 2160,
  },
  BROADCAST_1080P: {
    preset: 'BROADCAST_1080P',
    videoCodec: 'libx264',
    crf: 17,
    encoderPreset: 'slow',
    pixelFormat: 'yuv420p',
    colorPrimaries: 'bt709',
    colorTrc: 'bt709',
    colorSpace: 'bt709',
    audioCodec: 'aac',
    audioBitrateKbps: 256,
    audioSampleRateHz: 48000,
    defaultLoudnessLufs: -23,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  WEB_MASTER: {
    preset: 'WEB_MASTER',
    videoCodec: 'libx264',
    crf: 18,
    encoderPreset: 'slow',
    pixelFormat: 'yuv420p',
    colorPrimaries: 'bt709',
    colorTrc: 'bt709',
    colorSpace: 'bt709',
    audioCodec: 'aac',
    audioBitrateKbps: 256,
    audioSampleRateHz: 48000,
    defaultLoudnessLufs: -14,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  SOCIAL_9_16: {
    preset: 'SOCIAL_9_16',
    videoCodec: 'libx264',
    crf: 18,
    encoderPreset: 'medium',
    pixelFormat: 'yuv420p',
    colorPrimaries: 'bt709',
    colorTrc: 'bt709',
    colorSpace: 'bt709',
    audioCodec: 'aac',
    audioBitrateKbps: 192,
    audioSampleRateHz: 48000,
    defaultLoudnessLufs: -14,
    maxWidth: 1080,
    maxHeight: 1920,
  },
};

export function buildFfmpegArgs(
  inputPath: string,
  outputPath: string,
  preset: ExportPreset,
  loudnessTargetLufs?: -14 | -16 | -23,
): string[] {
  const profile = FFMPEG_EXPORT_PROFILES[preset];
  const lufs = loudnessTargetLufs ?? profile.defaultLoudnessLufs;

  return [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    profile.videoCodec,
    '-preset',
    profile.encoderPreset,
    '-crf',
    String(profile.crf),
    '-pix_fmt',
    profile.pixelFormat,
    '-color_primaries',
    profile.colorPrimaries,
    '-color_trc',
    profile.colorTrc,
    '-colorspace',
    profile.colorSpace,
    '-af',
    `loudnorm=I=${lufs}:TP=-1.5:LRA=11`,
    '-c:a',
    profile.audioCodec,
    '-b:a',
    `${profile.audioBitrateKbps}k`,
    '-ar',
    String(profile.audioSampleRateHz),
    '-movflags',
    '+faststart',
    outputPath,
  ];
}
