import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import StatusPage from './pages/Status.jsx';
import EmailPage from './pages/Email.jsx';
import NotificationPage from './pages/Notification.jsx';
import AuditPage from './pages/Audit.jsx';
import { ensureSession, login, logout } from './services/auth.js';

const RequireAuth = ({ loading, authenticated, children }) => {
  if (loading) {
    return (
      <section className="card">
        <p className="hero-meta">Loading session...</p>
      </section>
    );
  }
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

RequireAuth.propTypes = {
  loading: PropTypes.bool.isRequired,
  authenticated: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default function App() {
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
    expiresIn: 0,
    user: null,
  });
  const location = useLocation();
  const isAuthed = session.authenticated;

  const footerTitle = useMemo(() => {
    const path = location.pathname || '';
    if (path.startsWith('/email')) return 'Send Email';
    if (path.startsWith('/notification')) return 'Send Notification';
    if (path.startsWith('/audit')) return 'Audit Events';
    if (path.startsWith('/login')) return 'Sign In';
    return 'Status';
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const nextSession = await ensureSession();
        if (active) {
          setSession({ loading: false, ...nextSession });
        }
      } catch (err) {
        console.warn('Failed to ensure session', err);
        if (active) {
          setSession({
            loading: false,
            authenticated: false,
            expiresIn: 0,
            user: null,
          });
        }
      }
    };

    syncSession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email, password) => {
    const nextSession = await login(email, password);
    setSession({ loading: false, ...nextSession });
  };

  const handleLogout = async () => {
    await logout();
    setSession({
      loading: false,
      authenticated: false,
      expiresIn: 0,
      user: null,
    });
  };

  const handleLogoutClick = () => {
    handleLogout().catch((err) => {
      console.warn('Logout failed', err);
    });
  };

  const logo = '/docker-icon.svg';

  return (
    <div className="page">
      <nav className="nav">
        <div className="brand">
          <div className="brand-icon">
            <img src={logo} alt="Docker" />
          </div>
          <div>
            <div className="brand-title">DevOps Demo</div>
            <div className="brand-subtitle">Docker microservices dashboard</div>
          </div>
        </div>
        <div className="nav-actions">
          {isAuthed && (
            <>
              <Link className="link" to="/">Status</Link>
              <Link className="link" to="/email">Send Email</Link>
              <Link className="link" to="/notification">Send Notification</Link>
              <Link className="link" to="/audit">Audit Events</Link>
            </>
          )}
          {isAuthed && (
            <button className="button ghost" type="button" onClick={handleLogoutClick}>
              Logout
            </button>
          )}
        </div>
      </nav>

      <main className="content">
        <Routes>
          <Route
            path="/login"
            element={isAuthed ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
          />
          <Route
            path="/"
            element={
              <RequireAuth loading={session.loading} authenticated={session.authenticated}>
                <StatusPage />
              </RequireAuth>
            }
          />
          <Route
            path="/email"
            element={
              <RequireAuth loading={session.loading} authenticated={session.authenticated}>
                <EmailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/notification"
            element={
              <RequireAuth loading={session.loading} authenticated={session.authenticated}>
                <NotificationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireAuth loading={session.loading} authenticated={session.authenticated}>
                <AuditPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={isAuthed ? '/' : '/login'} replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <span className="footer-title">{footerTitle}</span>
        <span className="footer-meta">Node/React stack</span>
      </footer>
    </div>
  );
}
