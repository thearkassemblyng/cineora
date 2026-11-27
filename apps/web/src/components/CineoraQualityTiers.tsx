'use client';

interface QualityTierSpec {
  id: string;
  name: string;
  badge: string;
  maxResolution: string;
  audioSpec: string;
  creditsPerSecond: number;
  bestFor: string;
  limitations: string;
}

const CINEORA_QUALITY_TIERS: QualityTierSpec[] = [
  {
    id: 'CINEMA_MASTER',
    name: 'CINEORA Cinema Master',
    badge: 'Flagship',
    maxResolution: 'Up to 4K UHD',
    audioSpec: 'Native Synchronized Audio & Lip-Sync',
    creditsPerSecond: 12,
    bestFor: 'Hero commercials, cinema storytelling, realistic human dialogue, and broadcast masters.',
    limitations: 'Highest credit rate and longer render times for maximum visual clarity.',
  },
  {
    id: 'HIGH',
    name: 'CINEORA Studio HD',
    badge: 'Balanced',
    maxResolution: 'Full HD 1080p',
    audioSpec: 'External Studio Voiceover & Music Mix',
    creditsPerSecond: 8,
    bestFor: 'Brand films, documentaries, news segments, and multi-scene narrative continuity.',
    limitations: 'Native output capped at 1080p; dialogue narration mixed via Studio Audio track.',
  },
  {
    id: 'STANDARD',
    name: 'CINEORA Express',
    badge: 'Fast',
    maxResolution: 'Full HD 1080p',
    audioSpec: 'Silent Video (Add Music / Voiceover)',
    creditsPerSecond: 6,
    bestFor: 'Rapid concept previews, B-roll exploration, and high-volume social media cuts.',
    limitations: 'Optimized for turnaround speed rather than complex close-up dialogue.',
  },
];

export function CineoraQualityTiers() {
  return (
    <section className="card" aria-label="CINEORA Production Quality Tiers">
      <div>
        <h2>CINEORA Production Quality Tiers</h2>
        <p className="muted">
          Choose the exact resolution, realism, and audio pipeline your production requires — with
          transparent output specs and automated Video QC on every scene.
        </p>
      </div>

      <div className="grid">
        {CINEORA_QUALITY_TIERS.map((tier) => (
          <article key={tier.id} className="subcard">
            <div className="row-between">
              <strong>{tier.name}</strong>
              <span className="pill pill-live">{tier.badge}</span>
            </div>

            <div className="metrics-row">
              <span>{tier.maxResolution}</span>
              <span>{tier.creditsPerSecond} cr/sec</span>
            </div>

            <div className="metrics-row">
              <span>{tier.audioSpec}</span>
            </div>

            <p style={{ marginTop: 10, fontSize: '0.84rem' }}>{tier.bestFor}</p>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem' }}>
              Spec note: {tier.limitations}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
