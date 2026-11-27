'use client';

import { useState } from 'react';

interface DirectorPreset {
  id: string;
  label: string;
  shot: string;
  camera: string;
  lighting: string;
  audio: string;
  resolution: string;
  prompt: string;
  accentGradient: string;
}

const DIRECTOR_PRESETS: DirectorPreset[] = [
  {
    id: 'cinema',
    label: 'Cinema Film',
    shot: 'CLOSE-UP · 50MM ANAMORPHIC',
    camera: 'SLOW DOLLY-IN',
    lighting: 'CHIAROSCURO GOLDEN RIM',
    audio: 'NATIVE DIALOGUE + RAIN AMBIENCE',
    resolution: '4K UHD · 24 FPS · BT.2020',
    prompt:
      'Rain-slicked Tokyo alleyway at dusk. A lone detective pauses beneath warm amber lantern light, shallow depth of field capturing natural skin texture and wet reflections.',
    accentGradient:
      'radial-gradient(circle at 72% 32%, rgba(229, 169, 60, 0.38), rgba(14, 24, 48, 0.72) 48%, rgba(4, 5, 8, 0.96) 85%)',
  },
  {
    id: 'commercial',
    label: 'Luxury Ad',
    shot: 'MACRO · EXTREME CLOSE-UP',
    camera: 'PRECISION TRACKING',
    lighting: 'STUDIO SOFTBOX + SPECULAR',
    audio: 'MECHANICAL SFX + STUDIO VOICEOVER',
    resolution: '4K UHD · 24 FPS · REC.709 FILMIC',
    prompt:
      'Ultra-sharp macro shot gliding across a sapphire-crystal tourbillon watch movement. Crisp metallic micro-textures, balanced highlights, zero flicker.',
    accentGradient:
      'radial-gradient(circle at 28% 35%, rgba(96, 165, 250, 0.34), rgba(17, 24, 39, 0.78) 50%, rgba(4, 5, 8, 0.97) 86%)',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    shot: 'AERIAL · ESTABLISHING',
    camera: 'STABILIZED DRONE ORBIT',
    lighting: 'NATURAL GOLDEN HOUR',
    audio: 'SPATIAL WIND + EBU R128 NARRATION',
    resolution: '4K UHD · 24 FPS · HDR',
    prompt:
      'Sweeping aerial orbit over misty emerald basalt cliffs in Iceland as low golden sunlight breaks across the ocean horizon.',
    accentGradient:
      'radial-gradient(circle at 55% 24%, rgba(45, 212, 191, 0.30), rgba(12, 30, 38, 0.76) 48%, rgba(4, 5, 8, 0.97) 85%)',
  },
  {
    id: 'broadcast',
    label: 'Broadcast News',
    shot: 'MEDIUM · STUDIO FRAMING',
    camera: 'LOCKED-OFF STEADY',
    lighting: 'HIGH-KEY BROADCAST',
    audio: 'BROADCAST VOICE · -23 LUFS',
    resolution: '1080P · 30 FPS · BT.709',
    prompt:
      'Crisp, natural studio presenter delivering breaking global tech news with accurate lip synchronization, clean skin tones, and depth-separated studio backdrop.',
    accentGradient:
      'radial-gradient(circle at 65% 40%, rgba(168, 85, 247, 0.30), rgba(20, 18, 42, 0.76) 48%, rgba(4, 5, 8, 0.97) 86%)',
  },
];

interface LandingShowcaseProps {
  onOpenAuth: () => void;
}

export function LandingShowcase({ onOpenAuth }: LandingShowcaseProps) {
  const [activePreset, setActivePreset] = useState<DirectorPreset>(DIRECTOR_PRESETS[0]);

  return (
    <div className="veo-landing">
      {/* Hero Section */}
      <section className="veo-hero">
        <div className="veo-eyebrow">CINEORA STUDIO · 4K CINEMATIC GENERATION</div>
        <h1 className="veo-headline">
          Direct cinema-grade video
          <br />
          <span className="veo-headline-accent">with synchronized sound.</span>
        </h1>
        <p className="veo-subcopy">
          From script and storyboard to 4K visuals, native audio, automated video QC, and
          quality-preserving FFmpeg mastering — engineered for filmmakers, brands, and global
          production teams.
        </p>

        <div className="veo-cta-row">
          <button type="button" className="btn-hero-primary" onClick={onOpenAuth}>
            Start Creating
          </button>
          <a href="#capabilities" className="btn-hero-secondary">
            Explore Capabilities
          </a>
        </div>

        {/* Full-Bleed 2.39:1 Widescreen Director Frame */}
        <div
          className="cinema-stage"
          style={{ background: activePreset.accentGradient }}
          aria-label="Interactive CINEORA Director Frame"
        >
          <div className="cinema-letterbox-top">
            <span className="hud-chip">{activePreset.resolution}</span>
            <span className="hud-chip">{activePreset.shot}</span>
            <span className="hud-chip">{activePreset.camera}</span>
          </div>

          <div className="cinema-stage-center">
            <div className="cinema-lens-ring" aria-hidden="true" />
            <div className="cinema-prompt-overlay">
              <div className="cinema-prompt-label">COMPILED DIRECTOR PROMPT</div>
              <p className="cinema-prompt-text">“{activePreset.prompt}”</p>
              <div className="cinema-prompt-meta">
                <span>Lighting: {activePreset.lighting}</span>
                <span>•</span>
                <span>Audio: {activePreset.audio}</span>
              </div>
            </div>
          </div>

          <div className="cinema-preset-bar" role="tablist" aria-label="Production Style Presets">
            {DIRECTOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="tab"
                aria-selected={activePreset.id === preset.id}
                className={`preset-pill ${activePreset.id === preset.id ? 'active' : ''}`}
                onClick={() => setActivePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Bento Grid */}
      <section id="capabilities" className="veo-section">
        <div className="veo-section-header">
          <span className="veo-eyebrow">BUILT FOR PRODUCTION STANDARDS</span>
          <h2 className="veo-section-title">Every frame engineered for visual clarity.</h2>
        </div>

        <div className="bento-grid">
          <article className="bento-card bento-wide">
            <span className="bento-tag">VISUAL EXCELLENCE</span>
            <h3>Native 1080p &amp; 4K Cinematic Realism</h3>
            <p>
              Crisp skin details, realistic surface textures, filmic dynamic range, and rich color
              grading — eliminating the blur, washed-out tones, and compression artifacts of generic
              AI video tools.
            </p>
          </article>

          <article className="bento-card">
            <span className="bento-tag">SYNCHRONIZED SOUND</span>
            <h3>Native Audio, Dialogue &amp; Mastering</h3>
            <p>
              Generate ambient soundscapes, SFX, and lip-synced dialogue, then master multi-track
              narration and music to EBU R128 broadcast standards (-14 / -23 LUFS).
            </p>
          </article>

          <article className="bento-card">
            <span className="bento-tag">DIRECTOR CONTROLS</span>
            <h3>Camera, Lighting &amp; Scene Continuity</h3>
            <p>
              Lock character appearance, wardrobe, and Style Bible rules across every shot. Regenerate
              any individual scene without rebuilding your entire project.
            </p>
          </article>

          <article className="bento-card bento-wide">
            <span className="bento-tag">AUTOMATED QC &amp; FFMPEG MASTERING</span>
            <h3>Quality Control Before Final Export</h3>
            <p>
              Every generated scene is inspected for resolution, sharpness, temporal flicker, and A/V
              sync before quality-preserving FFmpeg assembly in Cinema 4K (10-bit HEVC), Broadcast
              1080p, Web Master, or 9:16 Social presets.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
