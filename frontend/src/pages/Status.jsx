import React, { useCallback, useEffect, useRef, useState } from 'react';
import { probeHealthEndpoint, fetchMessage } from '../services/api.js';
import {
  API_URL,
  AUDIT_URL,
  AUTH_URL,
  GATEWAY_URL,
  MAILER_URL,
  NOTIFY_URL,
} from '../services/config.js';

const toHealthUrl = (base) => `${(base || '').replace(/\/+$/, '')}/health`;

const SERVICE_TARGETS = [
  { key: 'gateway', label: 'Gateway', url: toHealthUrl(GATEWAY_URL) },
  { key: 'auth', label: 'Auth Service', url: toHealthUrl(AUTH_URL) },
  { key: 'api', label: 'API Service', url: toHealthUrl(API_URL) },
  { key: 'audit', label: 'Audit Service', url: toHealthUrl(AUDIT_URL) },
  { key: 'mailer', label: 'Mailer Service', url: toHealthUrl(MAILER_URL) },
  { key: 'notify', label: 'Notification Service', url: toHealthUrl(NOTIFY_URL) },
  { key: 'frontend', label: 'Frontend UI' },
];
const DASHBOARD_POLL_INTERVAL_MS = 10000;

export default function StatusPage({ token }) {
  const [loading, setLoading] = useState(false);
  const [statusOk, setStatusOk] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState('');
  const [serviceStatuses, setServiceStatuses] = useState(() =>
    SERVICE_TARGETS.map((service) => ({
      ...service,
      state: 'unknown',
      detail: 'checking',
    })),
  );
  const dashboardRefreshInFlight = useRef(false);
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setStatusOk(false);
      try {
        await fetchMessage(token);
        if (isMounted) {
          setStatusOk(true);
        }
      } catch (err) {
        if (isMounted) {
          setStatusOk(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const refreshDashboard = useCallback(async () => {
    if (dashboardRefreshInFlight.current) {
      return;
    }
    dashboardRefreshInFlight.current = true;
    setDashboardLoading(true);
    setServiceStatuses(
      SERVICE_TARGETS.map((service) => ({
        ...service,
        state: 'unknown',
        detail: 'checking',
      })),
    );

    try {
      const checks = await Promise.all(
        SERVICE_TARGETS.map(async (service) => {
          if (!service.url) {
            return {
              ...service,
              state: 'up',
              detail: '',
            };
          }
          const result = await probeHealthEndpoint(service.url);
          return {
            ...service,
            ...result,
            detail: result.detail === 'ok' ? '' : result.detail,
          };
        }),
      );

      setServiceStatuses(checks);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setDashboardLoading(false);
      dashboardRefreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    let pollTimerId = null;

    const stopPolling = () => {
      if (pollTimerId === null) {
        return;
      }
      clearInterval(pollTimerId);
      pollTimerId = null;
    };

    const startPolling = () => {
      if (document.hidden || pollTimerId !== null) {
        return;
      }
      pollTimerId = setInterval(() => {
        void refreshDashboard();
      }, DASHBOARD_POLL_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      void refreshDashboard();
      startPolling();
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshDashboard]);

  const heroImage = '/chibi_with_docker_no_background.svg';

  return (
    <>
      <section className="hero">
        <div className="hero-card">
          <p className="eyebrow">Status</p>
          <h1>Microservices deployed and working</h1>
          {loading && <p className="hero-meta">Checking services...</p>}
          {!loading && statusOk && <p className="hero-meta success">All services reachable.</p>}
          {!loading && !statusOk && (
            <p className="hero-meta">Service status not available yet.</p>
          )}
        </div>
        <div className="hero-visual">
          <img src={heroImage} alt="Node + React" />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Service Dashboard</h2>
          <button className="button secondary small" type="button" onClick={refreshDashboard}>
            Refresh
          </button>
        </div>
        {dashboardLoading && <p className="hero-meta">Refreshing dashboard...</p>}
        {!dashboardLoading && lastChecked && (
          <p className="hero-meta">Last checked at {lastChecked}</p>
        )}

        <div className="service-grid">
          {serviceStatuses.map((service) => (
            <article className="service-tile" key={service.key}>
              <span className="service-name">{service.label}</span>
              {service.detail && <p className="service-detail">{service.detail}</p>}
              <span className={`service-badge ${service.state}`}>{service.state}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
