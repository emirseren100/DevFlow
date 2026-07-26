import { useEffect, useState } from 'react';

import { API_URL } from '../lib/env';

type HealthState = 'checking' | 'ok' | 'unreachable';

const labels: Record<HealthState, string> = {
  checking: 'API status: checking...',
  ok: 'API status: ok',
  unreachable: 'API status: unreachable',
};

/**
 * Smallest possible proof that the client can reach the server without a CORS
 * error. Replaced by real data fetching in later phases.
 */
export default function HealthStatus() {
  const [state, setState] = useState<HealthState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (!cancelled) {
          setState(response.ok ? 'ok' : 'unreachable');
        }
      } catch {
        if (!cancelled) {
          setState('unreachable');
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className={`health health--${state}`} role="status">
      {labels[state]}
    </p>
  );
}
