'use client';

import { useState } from 'react';
import { AuthTokensResponse } from '@cineora/contracts';
import { CineoraWebClient } from '../lib/api-client';

interface AuthPanelProps {
  client: CineoraWebClient;
  onAuthenticated: (auth: AuthTokensResponse) => void;
}

export function AuthPanel({ client, onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tokens =
        mode === 'register'
          ? await client.register({ email, password, fullName })
          : await client.login({ email, password });
      onAuthenticated(tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card auth-card" aria-label="Studio Authentication">
      <div className="row-between">
        <h2>{mode === 'login' ? 'Sign In to CINEORA Studio' : 'Create Studio Account'}</h2>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        {mode === 'register' && (
          <label className="field">
            <span>Full Name</span>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ava Director"
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="director@studio.com"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </label>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting
            ? 'Authenticating…'
            : mode === 'login'
              ? 'Enter Production Studio'
              : 'Create Studio Account'}
        </button>
      </form>
    </section>
  );
}
