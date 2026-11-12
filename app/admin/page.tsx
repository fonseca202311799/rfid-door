"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "rfid-door-state";
const SESSION_KEY = "rfid-admin-session";
type Card = { uid: string; name: string; active: boolean };
type LogEntry = { id: string; time: Date; uid: string; who: string; granted: boolean };
const seedCards: Card[] = [
  { uid: "04A1B2C3", name: "Maria Santos", active: true },
  { uid: "04D4E5F6", name: "Juan dela Cruz", active: true },
  { uid: "04778899", name: "Old contractor badge", active: false },
];

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>(seedCards);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const sync = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      setCards(saved.cards ?? seedCards);
      setLogs((saved.log ?? []).map((entry: Omit<LogEntry, "time"> & { time: string }) => ({
        ...entry,
        time: new Date(entry.time),
      })));
    } catch (error) {
      console.warn("Unable to refresh dashboard state.", error);
    }
  };

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) !== "true") {
      router.replace("/admin/login");
      return;
    }
    sync();
    setReady(true);
    const interval = window.setInterval(sync, 2000);
    return () => window.clearInterval(interval);
  }, [router]);

  const granted = useMemo(() => logs.filter((entry) => entry.granted).length, [logs]);
  const denied = logs.length - granted;
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    router.replace("/admin/login");
  };

  if (!ready) return null;
  return (
    <main className="page wide">
      <header className="header">
        <div><p className="eyebrow">RFID access control</p><h1>Admin dashboard</h1><p className="muted">Live overview of your front-door reader.</p></div>
        <div className="actions"><button className="button secondary" onClick={logout}>Sign out</button></div>
      </header>
      <section className="metrics">
        <article className="metric"><span className="muted">Total scans</span><strong>{logs.length}</strong></article>
        <article className="metric"><span className="muted">Access granted</span><strong className="success">{granted}</strong></article>
        <article className="metric"><span className="muted">Access denied</span><strong className="error">{denied}</strong></article>
        <article className="metric"><span className="muted">Active cards</span><strong>{cards.filter((card) => card.active).length}</strong></article>
      </section>
      <div className="dashboard-grid">
        <section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Monitoring</p><h2>Registered cards</h2></div><span className="success">● Live</span></div><ul>{cards.map((card) => <li key={card.uid}><div><strong>{card.name}</strong><span className="muted">{card.uid}</span></div><span className={card.active ? "success" : "muted"}>{card.active ? "Active" : "Disabled"}</span></li>)}</ul></section>
        <section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Audit trail</p><h2>Recent activity</h2></div><span className="muted">{logs.length} events</span></div>{logs.length === 0 ? <p className="muted">No access events yet.</p> : <ul>{logs.slice(0, 12).map((entry) => <li key={entry.id}><div><strong>{entry.who}</strong><span className="muted">{entry.uid} · {entry.time.toLocaleString()}</span></div><span className={entry.granted ? "success" : "error"}>{entry.granted ? "Granted" : "Denied"}</span></li>)}</ul>}</section>
      </div>
    </main>
  );
}
