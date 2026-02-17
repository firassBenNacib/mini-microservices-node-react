import React, { useState } from 'react';
import { sendTestNotification } from '../services/api.js';

const COUNTRY_CODES = [
  { name: 'Afghanistan', code: '+93' },
  { name: 'Algeria', code: '+213' },
  { name: 'Argentina', code: '+54' },
  { name: 'Australia', code: '+61' },
  { name: 'Austria', code: '+43' },
  { name: 'Bahrain', code: '+973' },
  { name: 'Bangladesh', code: '+880' },
  { name: 'Belgium', code: '+32' },
  { name: 'Brazil', code: '+55' },
  { name: 'Bulgaria', code: '+359' },
  { name: 'Canada', code: '+1' },
  { name: 'Chile', code: '+56' },
  { name: 'China', code: '+86' },
  { name: 'Colombia', code: '+57' },
  { name: 'Croatia', code: '+385' },
  { name: 'Cyprus', code: '+357' },
  { name: 'Czech Republic', code: '+420' },
  { name: 'Denmark', code: '+45' },
  { name: 'Egypt', code: '+20' },
  { name: 'Estonia', code: '+372' },
  { name: 'Finland', code: '+358' },
  { name: 'France', code: '+33' },
  { name: 'Georgia', code: '+995' },
  { name: 'Germany', code: '+49' },
  { name: 'Ghana', code: '+233' },
  { name: 'Greece', code: '+30' },
  { name: 'Hungary', code: '+36' },
  { name: 'Iceland', code: '+354' },
  { name: 'India', code: '+91' },
  { name: 'Indonesia', code: '+62' },
  { name: 'Ireland', code: '+353' },
  { name: 'Israel', code: '+972' },
  { name: 'Italy', code: '+39' },
  { name: 'Japan', code: '+81' },
  { name: 'Jordan', code: '+962' },
  { name: 'Kenya', code: '+254' },
  { name: 'Kuwait', code: '+965' },
  { name: 'Latvia', code: '+371' },
  { name: 'Lebanon', code: '+961' },
  { name: 'Libya', code: '+218' },
  { name: 'Lithuania', code: '+370' },
  { name: 'Luxembourg', code: '+352' },
  { name: 'Malaysia', code: '+60' },
  { name: 'Mexico', code: '+52' },
  { name: 'Morocco', code: '+212' },
  { name: 'Netherlands', code: '+31' },
  { name: 'New Zealand', code: '+64' },
  { name: 'Nigeria', code: '+234' },
  { name: 'Norway', code: '+47' },
  { name: 'Oman', code: '+968' },
  { name: 'Pakistan', code: '+92' },
  { name: 'Philippines', code: '+63' },
  { name: 'Poland', code: '+48' },
  { name: 'Portugal', code: '+351' },
  { name: 'Qatar', code: '+974' },
  { name: 'Romania', code: '+40' },
  { name: 'Russia', code: '+7' },
  { name: 'Saudi Arabia', code: '+966' },
  { name: 'Senegal', code: '+221' },
  { name: 'Singapore', code: '+65' },
  { name: 'Slovakia', code: '+421' },
  { name: 'Slovenia', code: '+386' },
  { name: 'South Africa', code: '+27' },
  { name: 'South Korea', code: '+82' },
  { name: 'Spain', code: '+34' },
  { name: 'Sweden', code: '+46' },
  { name: 'Switzerland', code: '+41' },
  { name: 'Thailand', code: '+66' },
  { name: 'Tunisia', code: '+216' },
  { name: 'Turkey', code: '+90' },
  { name: 'Ukraine', code: '+380' },
  { name: 'United Arab Emirates', code: '+971' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'United States', code: '+1' },
  { name: 'Vietnam', code: '+84' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function NotificationPage({ token }) {
  const [notifyCountryCode, setNotifyCountryCode] = useState('');
  const [notifyLocalNumber, setNotifyLocalNumber] = useState('');
  const [notifyCategory, setNotifyCategory] = useState('Deployment');
  const [notifyPriority, setNotifyPriority] = useState('Info');
  const [notifyDetails, setNotifyDetails] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['Deployment', 'Security', 'Incident', 'Reminder'];
  const priorities = ['Info', 'Warning', 'Critical'];
  const computedSubject = `[${notifyPriority}] ${notifyCategory} notification`;
  const computedText = notifyDetails.trim() || `${notifyCategory} notification (${notifyPriority})`;

  const computedRecipient = `${notifyCountryCode}${notifyLocalNumber.replace(/\D/g, '')}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    if (!notifyCountryCode) {
      setStatus('Invalid country. Select a valid country code.');
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(computedRecipient)) {
      setStatus('Invalid number. Select country code and enter digits only.');
      return;
    }

    setLoading(true);
    try {
      await sendTestNotification(token, {
        to: computedRecipient,
        subject: computedSubject,
        text: computedText,
      });
      setStatus('Notification sent successfully.');
    } catch (err) {
      setStatus('Notification failed to send.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2>Send Test Notification</h2>
      </div>
      <div className="notify-layout">
        <form className="form" onSubmit={handleSubmit}>
          <div className="phone-grid">
            <label>
              Country/Region
              <select
                value={notifyCountryCode}
                onChange={(event) => setNotifyCountryCode(event.target.value)}
                required
              >
                <option value="" disabled>Select country/region</option>
                {COUNTRY_CODES.map((entry) => (
                  <option key={`${entry.name}-${entry.code}`} value={entry.code}>
                    {entry.name} ({entry.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Number
              <input
                type="tel"
                inputMode="numeric"
                value={notifyLocalNumber}
                onChange={(event) => setNotifyLocalNumber(event.target.value)}
                pattern="^[0-9]{4,14}$"
                placeholder="Enter number"
                required
              />
            </label>
          </div>
          <label>
            Category
            <select
              value={notifyCategory}
              onChange={(event) => setNotifyCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={notifyPriority}
              onChange={(event) => setNotifyPriority(event.target.value)}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label>
            Details (optional)
            <textarea
              rows="4"
              value={notifyDetails}
              onChange={(event) => setNotifyDetails(event.target.value)}
            />
          </label>
          {status && <p className="status">{status}</p>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send Notification'}
          </button>
        </form>

        <aside className="notify-preview">
          <p className="eyebrow">Preview</p>
          <h3>{computedSubject}</h3>
          <p className="muted sms-label">SMS Body</p>
          <p className="preview-text">{computedText}</p>
        </aside>
      </div>
    </section>
  );
}
