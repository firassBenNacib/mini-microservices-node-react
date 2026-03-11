import React, { useState } from 'react';
import { sendTestEmail } from '../services/api.js';

export default function EmailPage() {
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailText, setMailText] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setLoading(true);

    try {
      await sendTestEmail({
        to: mailTo,
        subject: mailSubject,
        text: mailText,
      });
      setStatus('Email sent successfully.');
    } catch (err) {
      console.warn('Failed to send email', err);
      setStatus('Email failed to send.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card email-card">
      <div className="card-header">
        <h2>Send Test Email</h2>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          <span>To</span>
          <input
            type="email"
            value={mailTo}
            onChange={(event) => setMailTo(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Subject</span>
          <input
            type="text"
            value={mailSubject}
            onChange={(event) => setMailSubject(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Text</span>
          <textarea
            rows="4"
            value={mailText}
            onChange={(event) => setMailText(event.target.value)}
            required
          />
        </label>
        {status && <p className="status">{status}</p>}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send Email'}
        </button>
      </form>
    </section>
  );
}
