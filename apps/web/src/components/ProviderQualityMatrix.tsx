'use client';

import { ProviderCapability } from '@cineora/contracts';

interface ProviderQualityMatrixProps {
  providers: ProviderCapability[];
  loading: boolean;
  error: string | null;
}

export function ProviderQualityMatrix({
  providers,
  loading,
  error,
}: ProviderQualityMatrixProps) {
  if (loading) {
    return (
      <section className="card">
        <h2>AI Provider Quality Matrix</h2>
        <p className="muted">Loading live provider capabilities and model specs…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <h2>AI Provider Quality Matrix</h2>
        <div className="alert alert-error" role="alert">
          Unable to load provider capabilities: {error}
        </div>
      </section>
    );
  }

  if (providers.length === 0) {
    return (
      <section className="card">
        <h2>AI Provider Quality Matrix</h2>
        <p className="muted">No AI providers registered on the orchestrator.</p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="AI Provider Quality Matrix">
      <div className="row-between">
        <div>
          <h2>Quality-First AI Provider Matrix</h2>
          <p className="muted">
            Honest model capabilities, native resolutions, and disclosed limitations. CINEORA never
            silently downgrades requested quality.
          </p>
        </div>
      </div>

      <div className="grid">
        {providers.map((p) => (
          <article key={`${p.providerId}-${p.modelId}`} className="subcard">
            <div className="row-between">
              <strong>
                {p.displayName} · <code>{p.modelId}</code>
              </strong>
              <span className={`pill ${p.configured ? 'pill-live' : 'pill-warn'}`}>
                {p.configured ? 'LIVE Ready' : 'API Key Needed'}
              </span>
            </div>

            <div className="metrics-row">
              <span>Max: {p.maxResolution}</span>
              <span>Visual: {p.visualQualityScore}/100</span>
              <span>Realism: {p.realismScore}/100</span>
              <span>Motion: {p.motionQualityScore}/100</span>
            </div>

            <div className="metrics-row">
              <span>{p.supportsNativeAudio ? 'Native Audio' : 'External Audio'}</span>
              <span>{p.supportsLipSync ? 'Lip-Sync' : 'No Lip-Sync'}</span>
              <span>{p.creditsPerSecond} cr/sec</span>
            </div>

            <ul className="limitations-list">
              {p.limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
