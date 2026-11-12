"use client";

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "rfid-admin-session";
const VERIFY_MS = 650;
const EXIT_MS = 750;

const step = (i: number) => ({ "--i": i }) as CSSProperties;

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === "true") router.replace("/admin");
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [router]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || leaving) return;
    setError("");
    setLoading(true);

    timers.current.push(
      window.setTimeout(() => {
        if (username.trim() === "admin" && password === "admin123") {
          localStorage.setItem(SESSION_KEY, "true");
          setLeaving(true);
          timers.current.push(
            window.setTimeout(() => router.push("/admin"), EXIT_MS)
          );
          return;
        }
        setError("Incorrect username or password.");
        setLoading(false);
      }, VERIFY_MS)
    );
  };

  return (
    <main className={`page lg-shell${leaving ? " lg-leaving" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ---------- Stage ---------- */}
      <aside className="lg-stage" aria-hidden="true">
        <div className="lg-stage-top lg-reveal" style={step(1)}>
          <div className="brand-mark">RF</div>
          <span className="lg-tag">RFID Access Control</span>
        </div>

        <div className="lg-reveal" style={step(2)}>
          <div className="lg-tap">
            <span className="lg-ring" />
            <span className="lg-ring" />
            <span className="lg-ring" />

            <div className="lg-reader">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 12.5a7 7 0 0 1 7-7" />
                <path d="M5 17a11.5 11.5 0 0 1 12-12" opacity=".65" />
                <path d="M5 21.5A16 16 0 0 1 21 5.5" opacity=".35" />
                <circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none" />
              </svg>
            </div>

            <div className="lg-card-rfid">
              <i className="lg-chip" />
              <b />
              <b />
            </div>

            <div className="lg-status">
              <span className="lg-s-locked">
                <i /> Door locked
              </span>
              <span className="lg-s-granted">
                <i /> Access granted
              </span>
            </div>
          </div>
        </div>

        <div className="lg-stage-bottom lg-reveal" style={step(3)}>
          <h2>Every tap, accounted for.</h2>
          <p>Live door activity, card management and instant access decisions in one place.</p>
        </div>
      </aside>

      {/* ---------- Form ---------- */}
      <section className="card auth-card lg-card">
        <div className="lg-inner">
          <div className="brand-mark lg-reveal" style={step(0)}>RF</div>
          <p className="eyebrow lg-reveal" style={step(1)}>Restricted area</p>
          <h1 className="lg-reveal" style={step(2)}>Welcome back</h1>
          <p className="muted lg-reveal" style={step(3)}>
            Sign in to monitor access activity and manage the RFID door.
          </p>

          <form onSubmit={submit}>
            <label className="lg-reveal" style={step(4)}>
              Username
              <div className="lg-field">
                <svg className="lg-field-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <input
                  name="username"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  aria-invalid={!!error}
                  required
                />
              </div>
            </label>

            <label className="lg-reveal" style={step(5)}>
              Password
              <div className="lg-field">
                <svg className="lg-field-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="3" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={!!error}
                  required
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </div>
            </label>

            {error && <p className="error lg-error" role="alert">{error}</p>}

            <button
              className={`button lg-submit lg-reveal${leaving ? " lg-granted" : ""}`}
              style={step(6)}
              type="submit"
              disabled={loading || leaving}
            >
              {loading && !leaving && <span className="lg-spinner" aria-hidden="true" />}
              {leaving && (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {leaving ? "Access granted" : loading ? "Verifying…" : "Sign in"}
              {!loading && !leaving && (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </form>

          <p className="hint lg-demo lg-reveal" style={step(7)}>
            Demo credentials <code>admin</code> / <code>admin123</code>
          </p>
        </div>
      </section>
    </main>
  );
}

const css = `
/* ---------- Layout ---------- */
main.page.lg-shell {
  max-width: none;
  margin: 0;
  padding: 16px;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 16px;
  place-items: stretch;
}

/* ---------- Stage (left) ---------- */
.lg-stage {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px;
  border-radius: var(--radius-lg);
  color: var(--cream);
  background:
    radial-gradient(60% 50% at 78% 18%, rgba(144, 228, 193, 0.38), transparent 70%),
    radial-gradient(50% 45% at 12% 92%, rgba(227, 191, 74, 0.22), transparent 70%),
    linear-gradient(160deg, #1d4d3a 0%, var(--forest) 55%, #0e2c1f 100%);
  box-shadow: var(--shadow-lg);
  isolation: isolate;
  animation: lg-stage-in 0.95s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.lg-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle, rgba(144, 228, 193, 0.28) 1px, transparent 1.6px);
  background-size: 22px 22px;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 48%, #000 20%, transparent 80%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 48%, #000 20%, transparent 80%);
}
.lg-stage-top { display: flex; align-items: center; gap: 14px; }
.lg-stage .brand-mark { box-shadow: 0 0 0 3px #1a4634, 0 0 0 4px var(--gold); }
.lg-tag {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(144, 228, 193, 0.35);
  background: rgba(144, 228, 193, 0.1);
  color: var(--teal);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.lg-stage-bottom h2 {
  color: var(--cream);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.12;
  margin: 0 0 10px;
}
.lg-stage-bottom p {
  margin: 0;
  max-width: 38ch;
  color: rgba(250, 247, 240, 0.7);
  font-size: 14px;
  font-weight: 500;
}

/* Tap animation */
.lg-tap { position: relative; width: 300px; height: 260px; margin: 24px auto; }
.lg-ring {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  border: 1.5px solid var(--teal);
  opacity: 0;
  animation: lg-ring 3.6s ease-out infinite;
}
.lg-ring:nth-child(2) { animation-delay: 1.2s; }
.lg-ring:nth-child(3) { animation-delay: 2.4s; }
@keyframes lg-ring {
  0%   { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.6); opacity: 0; }
}

.lg-reader {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 84px;
  height: 84px;
  margin: -42px 0 0 -42px;
  display: grid;
  place-items: center;
  border-radius: 26px;
  color: var(--forest);
  background: linear-gradient(145deg, var(--teal), #b9eed6);
  box-shadow: 0 0 0 8px rgba(144, 228, 193, 0.14), 0 16px 36px -10px rgba(0, 0, 0, 0.5);
}

.lg-card-rfid {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 138px;
  height: 88px;
  margin: -44px 0 0 -69px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fffdf8, var(--sand));
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.55);
  animation: lg-card 6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.lg-chip {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 24px;
  height: 18px;
  border-radius: 5px;
  background: linear-gradient(135deg, var(--gold), #f3dc8a);
}
.lg-card-rfid b { display: block; height: 5px; border-radius: 3px; background: var(--line); }
.lg-card-rfid b:last-child { width: 55%; }
@keyframes lg-card {
  0%   { transform: translate(150px, 70px) rotate(-14deg); opacity: 0; }
  12%  { opacity: 1; }
  38%  { transform: translate(0, 0) rotate(-4deg); }
  70%  { transform: translate(0, 0) rotate(-4deg); opacity: 1; }
  88%  { transform: translate(-150px, -60px) rotate(10deg); opacity: 0; }
  100% { transform: translate(-150px, -60px) rotate(10deg); opacity: 0; }
}

.lg-status {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  height: 34px;
  min-width: 170px;
}
.lg-status span {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}
.lg-status i { width: 8px; height: 8px; border-radius: 50%; }
.lg-s-locked  { background: rgba(255, 253, 248, 0.12); color: var(--cream); animation: lg-s-locked 6s infinite; }
.lg-s-locked i  { background: var(--no-bg); }
.lg-s-granted { background: var(--teal); color: var(--forest); opacity: 0; animation: lg-s-granted 6s infinite; }
.lg-s-granted i { background: var(--ok); }
@keyframes lg-s-locked  { 0%, 36% { opacity: 1; } 40%, 100% { opacity: 0; } }
@keyframes lg-s-granted { 0%, 38% { opacity: 0; } 42%, 74% { opacity: 1; } 80%, 100% { opacity: 0; } }

/* ---------- Card (right, original .card .auth-card) ---------- */
.card.auth-card.lg-card {
  width: 100%;
  max-width: none;
  display: grid;
  place-items: center;
  padding: 40px 28px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
  animation: lg-panel-in 0.95s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.lg-inner { width: min(100%, 380px); }
.lg-inner h1 { margin-bottom: 10px; }
.lg-inner form { margin-top: 30px; gap: 18px; }

.lg-field { position: relative; }
.lg-field-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
  transition: color 0.2s ease;
}
.lg-field input { width: 100%; padding: 13px 44px 13px 42px; }
.lg-field input::placeholder { color: #b3b6ae; }
.lg-field:focus-within .lg-field-icon { color: var(--forest); }
.lg-field input[aria-invalid="true"] { border-color: var(--no); background: var(--no-bg); }

.lg-eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  padding: 7px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  box-shadow: none;
}
.lg-eye:hover { background: var(--teal-mist); color: var(--forest); box-shadow: none; transform: translateY(-50%); }
.lg-eye:active { transform: translateY(-50%); }

.lg-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--no-bg);
  font-size: 13px;
  font-weight: 600;
  animation: lg-shake 0.45s ease;
}
@keyframes lg-shake {
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}

.lg-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 22px;
  margin-top: 4px;
  font-size: 15px;
}
.lg-submit svg { transition: transform 0.2s ease; }
.lg-submit:hover svg { transform: translateX(4px); }
.lg-submit:disabled { opacity: 0.85; cursor: progress; transform: none; box-shadow: none; }
.lg-submit.lg-granted { background: var(--ok); border-color: var(--ok); opacity: 1; }
.lg-submit.lg-granted svg { transform: none; }
.lg-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(250, 247, 240, 0.35);
  border-top-color: var(--cream);
  animation: lg-spin 0.7s linear infinite;
}
@keyframes lg-spin { to { transform: rotate(360deg); } }

.lg-demo {
  margin: 26px 0 0;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
  text-align: center;
}
.lg-demo code {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--teal-mist);
  color: var(--forest);
  font-weight: 600;
}

/* ---------- Page in ---------- */
@keyframes lg-stage-in { from { opacity: 0; transform: translateX(-48px) scale(0.98); } }
@keyframes lg-panel-in { from { opacity: 0; transform: translateX(48px) scale(0.98); } }

.lg-reveal {
  animation: lg-reveal-in 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 80ms + 280ms);
}
@keyframes lg-reveal-in {
  from { opacity: 0; transform: translateY(18px); filter: blur(5px); }
}

/* ---------- Page out ---------- */
@keyframes lg-stage-out { to { opacity: 0; transform: translateX(-64px) scale(0.97); } }
@keyframes lg-panel-out { to { opacity: 0; transform: translateX(64px) scale(0.97); } }
@keyframes lg-reveal-out {
  to { opacity: 0; transform: translateY(-14px); filter: blur(5px); }
}

.lg-leaving { pointer-events: none; }
.lg-leaving .lg-reveal {
  animation: lg-reveal-out 0.4s cubic-bezier(0.4, 0, 1, 1) both;
  animation-delay: calc(var(--i, 0) * 35ms);
}
.lg-leaving .lg-stage { animation: lg-stage-out 0.55s cubic-bezier(0.5, 0, 0.75, 0) 0.2s both; }
.lg-leaving .lg-card  { animation: lg-panel-out 0.55s cubic-bezier(0.5, 0, 0.75, 0) 0.2s both; }
.lg-leaving .lg-s-locked  { animation: none; opacity: 0; }
.lg-leaving .lg-s-granted { animation: none; opacity: 1; }

/* ---------- Responsive ---------- */
@media (max-width: 860px) {
  main.page.lg-shell { grid-template-columns: 1fr; padding: 12px; }
  .lg-stage { padding: 22px; }
  .lg-tap { transform: scale(0.72); height: 190px; margin: 0 auto; }
  .lg-stage-bottom { display: none; }
  .card.auth-card.lg-card { padding: 32px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .lg-stage, .lg-card, .lg-reveal, .lg-error, .lg-spinner,
  .lg-ring, .lg-card-rfid, .lg-s-locked, .lg-s-granted { animation: none !important; }
  .lg-s-granted { opacity: 0; }
  .lg-card-rfid { opacity: 1; transform: rotate(-4deg); }
  .lg-leaving .lg-s-locked { opacity: 0; }
  .lg-leaving .lg-s-granted { opacity: 1; }
}
`;