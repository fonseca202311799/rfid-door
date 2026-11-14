"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "rfid-admin-session";
const EXIT_MS = 700;
type Card = { uid: string; name: string; active: boolean };
type LogEntry = { id: string; time: Date; uid: string; who: string; granted: boolean };
type AccessEvent = {
  id: string;
  uid: string;
  granted: boolean;
  timestamp: string | null;
};
type DeviceStatus = {
  deviceId: string;
  doorOpen: boolean;
  wifiRssi: number | null;
  ipAddress: string | null;
  lastSeen: string | null;
  online: boolean;
};
const seedCards: Card[] = [
  { uid: "2C:D2:16:49", name: "Blue key fob", active: true },
];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

const step = (i: number) => ({ "--i": i }) as CSSProperties;

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirming, setConfirming] = useState(false); // 🆕
  const [cards, setCards] = useState<Card[]>(seedCards);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncError, setSyncError] = useState("");
  const timer = useRef<number>(0);

  const sync = async () => {
    try {
      setCards(seedCards);

      const response = await fetch("/api/access-events", { cache: "no-store" });
      if (!response.ok) throw new Error(`Access event request failed (${response.status}).`);

      const data = await response.json() as { events?: AccessEvent[] };
      setLogs((data.events ?? []).flatMap((event) => {
        if (!event.timestamp) return [];
        return [{
          id: event.id,
          time: new Date(event.timestamp),
          uid: event.uid,
          who: event.granted ? "Authorized card" : "Unauthorized card",
          granted: event.granted,
        }];
      }));
      setSyncError("");
    } catch (error) {
      console.warn("Unable to refresh dashboard state.", error);
      setSyncError("Unable to load Firestore access events.");
    }

    try {
      const response = await fetch("/api/device-status", { cache: "no-store" });
      if (!response.ok) throw new Error(`Device status request failed (${response.status}).`);
      const data = await response.json() as { status?: DeviceStatus | null };
      setDeviceStatus(data.status ?? null);
    } catch (error) {
      console.warn("Unable to refresh device status.", error);
      setDeviceStatus(null);
    }
  };

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) !== "true") {
      router.replace("/admin/login");
      return;
    }
    void sync();
    setReady(true);
    const interval = window.setInterval(() => void sync(), 3000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer.current);
    };
  }, [router]);

  // 🆕 Close the confirmation modal with Escape
  useEffect(() => {
    if (!confirming) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  const granted = useMemo(() => logs.filter((entry) => entry.granted).length, [logs]);
  const denied = logs.length - granted;
  const rate = logs.length ? Math.round((granted / logs.length) * 100) : 0;
  const activeCards = cards.filter((card) => card.active).length;
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return logs.filter((entry) => {
      const matchesSearch = !query ||
        entry.uid.toLowerCase().includes(query) ||
        entry.who.toLowerCase().includes(query);
      const matchesFrom = !from || entry.time >= from;
      const matchesTo = !to || entry.time <= to;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, logs, search]);
  const filteredGranted = filteredLogs.filter((entry) => entry.granted).length;
  const filteredRate = filteredLogs.length ? Math.round((filteredGranted / filteredLogs.length) * 100) : 0;
  const todayScans = logs.filter((entry) => entry.time.toDateString() === new Date().toDateString()).length;
  const weekScans = logs.filter((entry) => Date.now() - entry.time.getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const peakHour = logs.length
    ? Object.entries(logs.reduce<Record<string, number>>((hours, entry) => {
      const hour = entry.time.getHours().toString().padStart(2, "0");
      hours[hour] = (hours[hour] || 0) + 1;
      return hours;
    }, {})).sort(([, a], [, b]) => b - a)[0]?.[0]
    : null;

  const logout = () => {
    if (leaving) return;
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      localStorage.removeItem(SESSION_KEY);
      router.replace("/admin/login");
    }, EXIT_MS);
  };

  // 🆕 Confirm: close the modal, then run the existing logout untouched
  const confirmLogout = () => {
    setConfirming(false);
    logout();
  };

  if (!ready) return null;
  return (
    <main className={`page wide${leaving ? " ad-leaving" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="header ad-in" style={step(0)}>
        <div className="brand">
          <span className="brand-mark">GC</span>
          <div className="brand-name">
            <strong>Gordon College</strong>
            <span>RFID door access</span>
          </div>
        </div>
        {/* 🆕 opens the modal instead of logging out directly */}
        <button className="button secondary" onClick={() => setConfirming(true)} disabled={leaving}>Sign out</button>
      </header>

      <section className="hero ad-in" style={step(1)}>
        <div>
          <span className="live"><i /> Live</span>
          <h1>Front door activity</h1>
          <p>Refreshes every 3 seconds from your reader.</p>
        </div>

        <div className="ring" style={{ "--pct": rate } as CSSProperties}>
          <div className="ring-inner">
            <strong>{logs.length ? `${rate}%` : "–"}</strong>
            <span>granted</span>
          </div>
        </div>

        <div className="metrics">
          <article className="metric ad-in" style={step(3)}><span className="muted">Total scans</span><strong>{logs.length}</strong></article>
          <article className="metric ad-in" style={step(4)}><span className="muted">Access granted</span><strong className="success">{granted}</strong></article>
          <article className="metric ad-in" style={step(5)}><span className="muted">Access denied</span><strong className="error">{denied}</strong></article>
          <article className="metric ad-in" style={step(6)}><span className="muted">Active cards</span><strong>{activeCards}</strong></article>
        </div>
      </section>

      <section className="overview-grid">
        <article className="card status-card ad-in" style={step(2)}>
          <div className="panel-heading">
            <h2>Door status</h2>
            <span className={deviceStatus ? (deviceStatus.doorOpen ? "pill ok" : "pill off") : "pill off"}>
              {!deviceStatus ? "Unknown" : deviceStatus.doorOpen ? "Unlocked" : "Locked"}
            </span>
          </div>
          <strong className="status-value">
            {!deviceStatus ? "Door status unavailable" : deviceStatus.doorOpen ? "Door is unlocked" : "Door is locked"}
          </strong>
          <p className="muted">
            {deviceStatus?.lastSeen
              ? `Last updated ${new Date(deviceStatus.lastSeen).toLocaleTimeString()}`
              : "Waiting for device heartbeat"}
          </p>
        </article>
        <article className="card status-card ad-in" style={step(2)}>
          <div className="panel-heading">
            <h2>Device health</h2>
            <span className={deviceStatus?.online ? "pill ok" : "pill no"}>
              {deviceStatus?.online ? "Online" : "Offline"}
            </span>
          </div>
          <strong className="status-value">{deviceStatus?.deviceId ?? "ESP32 door reader"}</strong>
          <p className="muted">
            {deviceStatus?.online
              ? `${deviceStatus.wifiRssi ?? "—"} dBm Wi-Fi · ${deviceStatus.ipAddress ?? "IP unavailable"}`
              : "No heartbeat received in the last 90 seconds"}
          </p>
        </article>
      </section>

      <section className="card analytics ad-in" style={step(2)}>
        <div className="panel-heading">
          <h2>Analytics</h2>
          <span className="muted">Based on the latest {logs.length} events</span>
        </div>
        <div className="analytics-grid">
          <div><span className="muted">Today</span><strong>{todayScans}</strong></div>
          <div><span className="muted">Last 7 days</span><strong>{weekScans}</strong></div>
          <div><span className="muted">Filtered success rate</span><strong className="success">{filteredRate}%</strong></div>
          <div><span className="muted">Peak hour</span><strong>{peakHour ? `${peakHour}:00` : "—"}</strong></div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card panel ad-in" style={step(7)}>
          <div className="panel-heading">
            <h2>Registered cards</h2>
            <span className="muted">{cards.length} total</span>
          </div>
          <ul>
            {cards.map((card) => (
              <li key={card.uid} className="ad-row">
                <div className="who">
                  <span className={card.active ? "avatar" : "avatar off"}>{initials(card.name)}</span>
                  <div>
                    <strong>{card.name}</strong>
                    <span className="muted uid">{card.uid}</span>
                  </div>
                </div>
                <span className={card.active ? "pill ok" : "pill off"}>{card.active ? "Active" : "Disabled"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card panel ad-in" style={step(8)}>
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <span className="muted">{filteredLogs.length} shown</span>
          </div>
          <div className="filters">
            <input
              aria-label="Search access events"
              placeholder="Search UID or card"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label>
              From
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
          {syncError && <p className="error">{syncError}</p>}
          {filteredLogs.length === 0 ? (
            <div className="empty">
              <strong>{logs.length === 0 ? "No scans yet" : "No matching scans"}</strong>
              <p className="muted">{logs.length === 0 ? "Tap a card on the reader and it will show up here." : "Try changing the search or date filters."}</p>
            </div>
          ) : (
            <ul className="log">
              {filteredLogs.slice(0, 100).map((entry) => (
                <li key={entry.id} className={`${entry.granted ? "granted" : "denied"} ad-row`}>
                  <div className="who">
                    <div>
                      <strong>{entry.who}</strong>
                      <span className="meta muted">
                        <span className="uid">{entry.uid}</span>
                        <span>{entry.time.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                  <span className={entry.granted ? "pill ok" : "pill no"}>{entry.granted ? "Granted" : "Denied"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 🆕 Sign-out confirmation modal (direct child of main, outside .ad-in blocks) */}
      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            aria-describedby="signout-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="signout-title">Sign out?</h2>
            <p id="signout-desc" className="muted">
              You'll be returned to the login page. The reader keeps working in the background.
            </p>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setConfirming(false)} autoFocus>Cancel</button>
              <button className="button" onClick={confirmLogout}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const css = `
/* ---------- Page in: blocks rise in sequence ---------- */
.ad-in {
  animation: ad-in 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 80ms + 60ms);
}
@keyframes ad-in {
  from { opacity: 0; transform: translateY(22px) scale(0.985); }
}

/* Rows (cards list / new scans) slide in when they first appear */
.ad-row { animation: ad-row 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes ad-row {
  from { opacity: 0; transform: translateX(-12px); }
}

/* ---------- Page out: bottom blocks leave first, header last ---------- */
.ad-leaving { pointer-events: none; }
.ad-leaving .ad-in {
  animation: ad-out 0.4s cubic-bezier(0.5, 0, 0.75, 0) both;
  animation-delay: calc((8 - var(--i, 0)) * 30ms);
}
@keyframes ad-out {
  to { opacity: 0; transform: translateY(-18px) scale(0.985); }
}

/* 🆕 ---------- Sign-out confirmation modal ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(23, 64, 47, 0.35);
  backdrop-filter: blur(4px);
  animation: modal-fade 0.2s ease both;
}
.modal {
  width: min(100%, 400px);
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--paper);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
  animation: modal-pop 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.modal h2 { font-size: 20px; margin-bottom: 8px; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
@keyframes modal-fade { from { opacity: 0; } }
@keyframes modal-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
}

@media (prefers-reduced-motion: reduce) {
  .ad-in, .ad-row,
  .ad-leaving .ad-in,
  .modal-backdrop, .modal { animation: none !important; } /* 🆕 modal added */
}
`;