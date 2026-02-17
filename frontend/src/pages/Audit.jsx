import React, { useEffect, useState } from 'react';
import { fetchAuditEvents } from '../services/audit.js';

export default function AuditPage({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditEvents(token, 10);
      setEvents(data || []);
    } catch (err) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>Recent Audit Events</h2>
        <button className="button secondary small" type="button" onClick={loadEvents}>
          Refresh
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {!loading && !events.length && <p className="message">No audit events yet.</p>}
      {!loading && events.length > 0 && (
        <ul className="audit-list">
          {events.map((event) => (
            <li key={event.id}>
              <div className="audit-title">
                {event.eventType} - {event.actor || 'unknown'}
              </div>
              <div className="audit-meta">
                {event.source || 'service'} • {event.createdAt || 'unknown time'}
              </div>
              {event.details && <div className="audit-details">{event.details}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
