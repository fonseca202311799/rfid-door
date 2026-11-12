"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "rfid-admin-session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username.trim() === "admin" && password === "admin123") {
      localStorage.setItem(SESSION_KEY, "true");
      router.push("/admin");
      return;
    }
    setError("Incorrect username or password.");
  };

  return (
    <main className="page">
      <section className="card auth-card">
        <div className="brand-mark">RF</div>
        <p className="eyebrow">Restricted area</p>
        <h1>Welcome back</h1>
        <p className="muted">
          Sign in to monitor access activity and manage the RFID door.
        </p>
        <form onSubmit={submit}>
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button" type="submit">Sign in</button>
        </form>
        <p className="hint">Demo credentials: admin / admin123</p>
      </section>
    </main>
  );
}
