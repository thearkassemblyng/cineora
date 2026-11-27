import { describe, expect, it } from 'vitest';
import { evaluateFfprobeQuality, parseFrameRate } from './analyzer';

describe('Automated Video QC Analyzer', () => {
  it('parses fractional FFprobe frame rates accurately', () => {
    expect(parseFrameRate('24000/1001')).toBeCloseTo(23.976, 3);
    expect(parseFrameRate('30/1')).toBe(30);
  });

  it('passes crisp 4K 24fps footage with clean A/V sync', () => {
    const report = evaluateFfprobeQuality(
      {
        format: { duration: '5.00', bit_rate: '28000000' },
        streams: [
          {
            codec_type: 'video',
            width: 3840,
            height: 2160,
            avg_frame_rate: '24/1',
            bit_rate: '26000000',
            duration: '5.00',
          },
          {
            codec_type: 'audio',
            duration: '5.01',
          },
        ],
      },
      {
        expectedWidth: 3840,
        expectedHeight: 2160,
        expectedFps: 24,
        measuredSharpnessScore: 92,
        measuredFlickerScore: 95,
      },
    );

    expect(report.passed).toBe(true);
    expect(report.artifactFlags).toEqual([]);
    expect(report.avSyncOffsetMs).toBe(10);
  });

  it('flags low resolution, compression bitrate, blur, flicker, and A/V drift', () => {
    const report = evaluateFfprobeQuality(
      {
        format: { duration: '5.00', bit_rate: '1200000' },
        streams: [
          {
            codec_type: 'video',
            width: 1280,
            height: 720,
            avg_frame_rate: '24/1',
            bit_rate: '1100000',
            duration: '5.00',
          },
          {
            codec_type: 'audio',
            duration: '5.35',
          },
        ],
      },
      {
        expectedWidth: 1920,
        expectedHeight: 1080,
        expectedFps: 24,
        measuredSharpnessScore: 52,
        measuredFlickerScore: 60,
      },
    );

    expect(report.passed).toBe(false);
    expect(report.artifactFlags).toContain('RESOLUTION_BELOW_TARGET');
    expect(report.artifactFlags).toContain('LOW_BITRATE_COMPRESSION');
    expect(report.artifactFlags).toContain('AV_SYNC_DRIFT');
    expect(report.artifactFlags).toContain('LOW_SHARPNESS_BLUR');
    expect(report.artifactFlags).toContain('TEMPORAL_FLICKER');
    expect(report.recommendations.length).toBeGreaterThanOrEqual(4);
  });
});
