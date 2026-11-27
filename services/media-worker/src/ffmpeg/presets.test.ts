import { describe, expect, it } from 'vitest';
import { buildFfmpegArgs, FFMPEG_EXPORT_PROFILES } from './presets';

describe('FFmpeg quality-preserving export profiles', () => {
  it('uses low-CRF visually lossless settings across all presets', () => {
    for (const profile of Object.values(FFMPEG_EXPORT_PROFILES)) {
      expect(profile.crf).toBeLessThanOrEqual(18);
      expect(profile.audioSampleRateHz).toBe(48000);
      expect(profile.audioBitrateKbps).toBeGreaterThanOrEqual(192);
    }
  });

  it('builds CINEMA_4K args with 10-bit HEVC, BT.2020 color tags, and EBU R128 loudness', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.mp4', 'CINEMA_4K');
    expect(args).toContain('libx265');
    expect(args).toContain('yuv420p10le');
    expect(args).toContain('bt2020');
    expect(args).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('applies broadcast -23 LUFS loudness normalization for BROADCAST_1080P', () => {
    const args = buildFfmpegArgs('in.mp4', 'out.mp4', 'BROADCAST_1080P');
    expect(args).toContain('loudnorm=I=-23:TP=-1.5:LRA=11');
    expect(args).toContain('bt709');
  });
});
