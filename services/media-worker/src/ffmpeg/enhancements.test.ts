import { describe, expect, it } from 'vitest';
import {
  buildEnhancementFilterChain,
  buildProjectAssemblyArgs,
  IMPLEMENTED_ENHANCEMENTS,
} from './enhancements';

describe('Honest FFmpeg Enhancement & Assembly Pipeline', () => {
  it('only exposes genuinely implemented enhancement capabilities', () => {
    expect(IMPLEMENTED_ENHANCEMENTS.length).toBeGreaterThanOrEqual(4);
    for (const cap of IMPLEMENTED_ENHANCEMENTS) {
      expect(cap.implemented).toBe(true);
      expect(cap.ffmpegFilter.length).toBeGreaterThan(0);
    }
  });

  it('builds a real FFmpeg filtergraph chain for denoise + filmic grade + upscale', () => {
    const chain = buildEnhancementFilterChain(
      ['DENOISE_HQDN3D', 'COLOR_GRADE_FILMIC', 'UPSCALE_LANCZOS'],
      3840,
      2160,
    );
    expect(chain).toContain('hqdn3d=');
    expect(chain).toContain('eq=contrast=');
    expect(chain).toContain('scale=3840:2160:flags=lanczos');
  });

  it('builds quality-preserving project concat assembly args', () => {
    const args = buildProjectAssemblyArgs({
      concatListPath: 'scenes.txt',
      outputPath: 'master.mp4',
      exportPreset: 'CINEMA_4K',
      enhancements: ['DENOISE_HQDN3D'],
    });
    expect(args).toContain('-f');
    expect(args).toContain('concat');
    expect(args).toContain('-vf');
    expect(args).toContain('libx265');
    expect(args).toContain('yuv420p10le');
  });
});
