'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthTokensResponse,
  CreditWalletSummary,
  HealthResponse,
  ProviderCapability,
} from '@cineora/contracts';
import { AuthPanel } from '../components/AuthPanel';
import { CineoraQualityTiers } from '../components/CineoraQualityTiers';
import { LandingShowcase } from '../components/LandingShowcase';
import { ProjectWorkspace } from '../components/ProjectWorkspace';
import { ProviderQualityMatrix } from '../components/ProviderQualityMatrix';
import { CineoraWebClient } from '../lib/api-client';

export default function StudioHomePage() {
  const [auth, setAuth] = useState<AuthTokensResponse | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [providers, setProviders] = useState<ProviderCapability[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const [wallet, setWallet] = useState<CreditWalletSummary | null>(null);
  const [projects, setProjects] = useState<
    Array<{ id: string; title: string; format: string; targetResolution: string }>
  >([]);
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);

  const isAdmin = auth?.user.role === 'ADMIN';

  const client = useMemo(
    () => new CineoraWebClient(() => auth?.accessToken ?? null),
    [auth?.accessToken],
  );

  useEffect(() => {
    let mounted = true;
    client
      .getHealth()
      .then((h) => {
        if (mounted) {
          setHealth(h);
          setHealthError(null);
        }
      })
      .catch((err) => {
        if (mounted) setHealthError(err instanceof Error ? err.message : 'Studio offline');
      });

    return () => {
      mounted = false;
    };
  }, [client]);

  useEffect(() => {
    if (!isAdmin) {
      setProviders([]);
      return;
    }
    let mounted = true;
    setProvidersLoading(true);
    client
      .listProviders()
      .then((list) => {
        if (mounted) {
          setProviders(list);
          setProvidersError(null);
        }
      })
      .catch((err) => {
        if (mounted) setProvidersError(err instanceof Error ? err.message : 'Orchestrator offline');
      })
      .finally(() => {
        if (mounted) setProvidersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [client, isAdmin]);

  const loadWallet = useCallback(async () => {
    if (!auth) return;
    const w = await client.getWallet();
    setWallet(w);
  }, [auth, client]);

  const selectProject = useCallback(
    async (projectId: string) => {
      const detail = await client.getProject(projectId);
      setSelectedProject(detail);
    },
    [client],
  );

  const refreshProjects = useCallback(
    async (selectId?: string) => {
      if (!auth) return;
      const list = (await client.listProjects()) as Array<{
        id: string;
        title: string;
        format: string;
        targetResolution: string;
      }>;
      setProjects(list);
      const nextId = selectId ?? list[0]?.id;
      if (nextId) {
        await selectProject(nextId);
      } else {
        setSelectedProject(null);
      }
    },
    [auth, client, selectProject],
  );

  useEffect(() => {
    if (!auth) return;
    setShowAuthModal(false);
    void loadWallet();
    void refreshProjects();
  }, [auth, loadWallet, refreshProjects]);

  return (
    <div className="page-root">
      <nav className="veo-navbar">
        <div className="veo-nav-inner">
          <div className="brand-lockup">
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-title">CINEORA</span>
          </div>

          {!auth && (
            <div className="veo-nav-links">
              <a href="#capabilities">Capabilities</a>
              <a href="#quality-tiers">Quality Tiers</a>
            </div>
          )}

          <div className="controls-inline">
            <div className="status-pill" aria-live="polite">
              <span
                className={`status-indicator ${health ? 'online' : healthError ? 'offline' : ''}`}
              />
              <span>{health ? 'Studio Online' : healthError ? 'Offline' : 'Connecting'}</span>
            </div>

            {auth && wallet && (
              <div className="badge">
                <span>
                  Credits: <strong>{wallet.availableCredits}</strong> ({wallet.reservedCredits}{' '}
                  reserved)
                </span>
              </div>
            )}

            {!auth ? (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn-nav-cta"
                  onClick={() => setShowAuthModal(true)}
                >
                  Try CINEORA
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost" onClick={() => setAuth(null)}>
                Sign Out ({auth.user.fullName})
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="studio-shell">
        {!auth ? (
          <div className="stack-xl">
            <LandingShowcase onOpenAuth={() => setShowAuthModal(true)} />

            <section id="quality-tiers">
              <CineoraQualityTiers />
            </section>

            <section className="veo-bottom-cta">
              <h2>Ready to direct your next production?</h2>
              <p className="muted">
                Launch CINEORA Studio on Web or Mobile with synchronized audio, scene continuity,
                and broadcast-ready FFmpeg exports.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => setShowAuthModal(true)}
              >
                Launch CINEORA Studio
              </button>
            </section>
          </div>
        ) : (
          <div className="stack-lg">
            <ProjectWorkspace
              client={client}
              projects={projects}
              selectedProject={selectedProject as never}
              onRefreshProjects={refreshProjects}
              onSelectProject={selectProject}
              onWalletUpdated={loadWallet}
            />

            <CineoraQualityTiers />

            {isAdmin && (
              <ProviderQualityMatrix
                providers={providers}
                loading={providersLoading}
                error={providersError}
              />
            )}
          </div>
        )}
      </main>

      {showAuthModal && !auth && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to CINEORA Studio"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false);
          }}
        >
          <div className="modal-content">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="veo-eyebrow">CINEORA STUDIO ACCESS</span>
              <button
                type="button"
                className="btn-ghost"
                aria-label="Close sign in dialog"
                onClick={() => setShowAuthModal(false)}
              >
                ✕
              </button>
            </div>
            <AuthPanel client={client} onAuthenticated={setAuth} />
          </div>
        </div>
      )}
    </div>
  );
}
