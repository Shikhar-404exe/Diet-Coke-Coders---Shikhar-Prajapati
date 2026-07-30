import React, { useState } from 'react';
import { GraduationCap, Shield, ArrowRight, AlertCircle, FileCheck2, UserCheck, BookOpen } from 'lucide-react';
import { loginStudent, loginAdmin, STUDENT_DEMO_PIN, resetDemoData } from './auth';

export default function LoginGate({ onAuthenticated }) {
  const [portal, setPortal] = useState(null);
  const [id, setId] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (portal === 'student') {
        const result = await loginStudent(id, secret);
        if (!result.ok) { setError(result.error); return; }
        onAuthenticated(result.session, result.via);
        return;
      }
      if (portal === 'admin') {
        const result = await loginAdmin(id, secret);
        if (!result.ok) { setError(result.error); return; }
        onAuthenticated(result.session, result.via);
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const pickPortal = (next) => {
    setPortal(next);
    setError('');
    setId('');
    setSecret('');
  };

  return (
    <div className="gate">
      <div className="gate-split">
        <aside className="gate-hero">
          <div className="gate-hero-top">
            <p className="gate-kicker">VIT campus helpdesk</p>
            <div className="gate-trust-row">
              <span className="gate-trust-pill">Policy-cited</span>
              <span className="gate-trust-pill">Confirm before ticket</span>
              <span className="gate-trust-pill">Ops SLA queue</span>
            </div>
          </div>

          <div className="gate-hero-main">
            <h1 className="gate-logo">Campus<br />Triage</h1>
            <p className="gate-tagline">
              Grounded answers from approved policy. Real tickets when a human is needed.
            </p>
          </div>

          <ol className="gate-steps">
            <li>
              <BookOpen size={14} strokeWidth={1.75} />
              <div>
                <strong>Retrieve</strong>
                <span>Search approved campus PDFs</span>
              </div>
            </li>
            <li>
              <FileCheck2 size={14} strokeWidth={1.75} />
              <div>
                <strong>Answer or refuse</strong>
                <span>Cite sources — or say no safely</span>
              </div>
            </li>
            <li>
              <UserCheck size={14} strokeWidth={1.75} />
              <div>
                <strong>Handoff</strong>
                <span>You confirm before staff is notified</span>
              </div>
            </li>
          </ol>
        </aside>

        <section className="gate-panel">
          {!portal && (
            <>
              <h2 className="gate-panel-title">Choose your portal</h2>
              <p className="gate-panel-sub">
                Role is fixed at login — students stay in Help; staff stay in Ops. No in-app flip.
              </p>
              <div className="gate-doors">
                <button type="button" className="gate-door" onClick={() => pickPortal('student')}>
                  <span className="gate-door-icon"><GraduationCap size={18} strokeWidth={1.75} /></span>
                  <span className="gate-door-title">Student Help</span>
                  <span className="gate-door-copy">Ask Wi‑Fi, portal, hostel, fees — track tickets with photo + QR.</span>
                  <ul className="gate-door-list">
                    <li>Cited answers</li>
                    <li>Confirm handoff</li>
                    <li>My Requests</li>
                  </ul>
                  <span className="gate-door-cta">Enter portal <ArrowRight size={14} /></span>
                </button>
                <button type="button" className="gate-door gate-door-ops" onClick={() => pickPortal('admin')}>
                  <span className="gate-door-icon gate-door-icon-ops"><Shield size={18} strokeWidth={1.75} /></span>
                  <span className="gate-door-title">Academic Ops</span>
                  <span className="gate-door-copy">Claim escalations, leave notes, hit SLAs, keep policy PDFs current.</span>
                  <ul className="gate-door-list">
                    <li>Queue + SLA</li>
                    <li>Staff notes</li>
                    <li>KB upload</li>
                  </ul>
                  <span className="gate-door-cta">Enter portal <ArrowRight size={14} /></span>
                </button>
              </div>
              <p className="gate-footnote">
                Track 2 demo path: grounded cite → safe refusal → controllable handoff.
              </p>
            </>
          )}

          {portal && (
            <form className="gate-form" onSubmit={submit}>
              <button type="button" className="gate-back" onClick={() => pickPortal(null)}>← Portals</button>
              <div className="gate-form-head">
                <span className={`gate-door-icon ${portal === 'admin' ? 'gate-door-icon-ops' : ''}`}>
                  {portal === 'student' ? <GraduationCap size={16} /> : <Shield size={16} />}
                </span>
                <div>
                  <h2 className="gate-panel-title">
                    {portal === 'student' ? 'Student Help' : 'Academic Ops'}
                  </h2>
                  <p className="gate-panel-sub" style={{ margin: '0.25rem 0 0' }}>
                    {portal === 'student'
                      ? 'Use your registration number and PIN.'
                      : 'Staff ID and password for the ops desk.'}
                  </p>
                </div>
              </div>
              <label>
                <span>{portal === 'student' ? 'Registration number' : 'Staff ID'}</span>
                <input
                  autoFocus
                  value={id}
                  onChange={(e) => setId(portal === 'student' ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={portal === 'student' ? '22BCE1002' : 'ops.admin'}
                  autoComplete="username"
                  disabled={busy}
                />
              </label>
              <label>
                <span>{portal === 'student' ? 'PIN' : 'Password'}</span>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={portal === 'student' ? STUDENT_DEMO_PIN : '••••••••'}
                  autoComplete="current-password"
                  disabled={busy}
                />
              </label>
              {error && (
                <div className="gate-error" role="alert">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" className="gate-submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <div className="gate-demo-card">
                <div className="gate-demo-label">Demo credentials</div>
                <p className="gate-hint" style={{ margin: 0 }}>
                  {portal === 'student' ? (
                    <>Reg <strong>22BCE1002</strong> · PIN <code>{STUDENT_DEMO_PIN}</code></>
                  ) : (
                    <>ID <code>ops.admin</code> · pass <code>campusops</code></>
                  )}
                </p>
                <button type="button" className="gate-text-btn" onClick={() => { resetDemoData(); setError(''); }}>
                  Clear local cache
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
