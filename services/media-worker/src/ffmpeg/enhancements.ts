import { ExportPreset } from '@cineora/contracts';
import { FFMPEG_EXPORT_PROFILES } from './presets';

export type ImplementedEnhancement =
  | 'DENOISE_HQDN3D'
  | 'COLOR_GRADE_FILMIC'
  | 'SHARPEN_UNSHARP'
  | 'UPSCALE_LANCZOS';

export interface EnhancementCapability {
  id: ImplementedEnhancement;
  label: string;
  description: string;
  implemented: true;
  ffmpegFilter: string;
}

/**
 * Honest registry of ONLY genuinely implemented FFmpeg enhancement capabilities.
 * Never advertise unimplemented capabilities.
 */
export const IMPLEMENTED_ENHANCEMENTS: EnhancementCapability[] = [
  {
    id: 'DENOISE_HQDN3D',
    label: 'Temporal & Spatial Denoise (hqdn3d)',
    description: 'Reduces visual grain and subtle temporal flicker while preserving detail.',
    implemented: true,
    ffmpegFilter: 'hqdn3d=1.5:1.5:6:6',
  },
  {
    id: 'COLOR_GRADE_FILMIC',
    label: 'Filmic Contrast & Color Balance',
    description: 'Enhances dynamic contrast and natural saturation without clipping highlights.',
    implemented: true,
    ffmpegFilter: 'eq=contrast=1.06:saturation=1.08:gamma=1.0',
  },
  {
    id: 'SHARPEN_UNSHARP',
    label: 'Clarity Sharpening (unsharp)',
    description: 'Subtle luma edge sharpening to restore crispness without halo artifacts.',
    implemented: true,
    ffmpegFilter: 'unsharp=5:5:0.65:5:5:0.0',
  },
  {
    id: 'UPSCALE_LANCZOS',
    label: 'High-Precision Lanczos Upscaling',
    description: 'Resizes footage to target resolution using Lanczos resampling.',
    implemented: true,
    ffmpegFilter: 'scale=3840:2160:flags=lanczos',
  },
];

export function buildEnhancementFilterChain(
  enhancements: ImplementedEnhancement[],
  targetWidth?: number,
  targetHeight?: number,
): string {
  const filters: string[] = [];
  for (const id of enhancements) {
    const cap = IMPLEMENTED_ENHANCEMENTS.find((item) => item.id === id);
    if (!cap) {
      throw new Error(`Unsupported or unimplemented enhancement requested: ${id}`);
    }
    if (id === 'UPSCALE_LANCZOS' && targetWidth && targetHeight) {
      filters.push(`scale=${targetWidth}:${targetHeight}:flags=lanczos`);
    } else {
      filters.push(cap.ffmpegFilter);
    }
  }
  return filters.join(',');
}

export function buildProjectAssemblyArgs(params: {
  concatListPath: string;
  outputPath: string;
  exportPreset: ExportPreset;
  loudnessTargetLufs?: -14 | -16 | -23;
  enhancements?: ImplementedEnhancement[];
}): string[] {
  const profile = FFMPEG_EXPORT_PROFILES[params.exportPreset];
  const lufs = params.loudnessTargetLufs ?? profile.defaultLoudnessLufs;

  const args: string[] = [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    params.concatListPath,
  ];

  if (params.enhancements && params.enhancements.length > 0) {
    const vf = buildEnhancementFilterChain(
      params.enhancements,
      profile.maxWidth,
      profile.maxHeight,
    );
    args.push('-vf', vf);
  }

  args.push(
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
    params.outputPath,
  );

  return args;
}
