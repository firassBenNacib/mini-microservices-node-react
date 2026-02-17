import React, { useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import StatusPage from './pages/Status.jsx';
import EmailPage from './pages/Email.jsx';
import NotificationPage from './pages/Notification.jsx';
import AuditPage from './pages/Audit.jsx';
import { clearToken, getToken, setToken } from './services/auth.js';
import { AUTH_URL } from './services/config.js';

const RequireAuth = ({ token, children }) => {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  const [token, setTokenState] = useState(() => getToken());
  const isAuthed = !!token;
  const location = useLocation();

  const footerTitle = useMemo(() => {
    const path = location.pathname || '';
    if (path.startsWith('/email')) return 'Send Email';
    if (path.startsWith('/notification')) return 'Send Notification';
    if (path.startsWith('/audit')) return 'Audit Events';
    if (path.startsWith('/login')) return 'Sign In';
    return 'Status';
  }, [location.pathname]);

  const handleLogin = async (email, password) => {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setTokenState(data.token);
  };

  const handleLogout = () => {
    clearToken();
    setTokenState('');
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
            <button className="button ghost" type="button" onClick={handleLogout}>
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
              <RequireAuth token={token}>
                <StatusPage token={token} />
              </RequireAuth>
            }
          />
          <Route
            path="/email"
            element={
              <RequireAuth token={token}>
                <EmailPage token={token} />
              </RequireAuth>
            }
          />
          <Route
            path="/notification"
            element={
              <RequireAuth token={token}>
                <NotificationPage token={token} />
              </RequireAuth>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireAuth token={token}>
                <AuditPage token={token} />
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
