"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "var(--bg)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    color: "var(--ink)",
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "var(--primary)",
              borderRadius: "12px 16px 12px 16px",
              transform: "rotate(-4deg)",
              boxShadow: "inset -3px -3px 0 rgba(0,0,0,0.12)",
            }}
          />
          <span style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em" }}>blip</span>
        </div>
        <p style={{ color: "var(--ink-2)", fontSize: 14 }}>say blip. join the conversation.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
            Nickname
          </label>
          <input
            type="text"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="your_handle"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 8 characters"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "var(--primary)",
            color: "var(--primary-ink)",
            border: "none",
            borderRadius: 14,
            padding: "12px 0",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            boxShadow: "0 2px 0 rgba(26,19,36,0.1)",
            transition: "transform 0.15s, opacity 0.15s",
            marginTop: 8,
          }}
        >
          {loading ? "creating account…" : "create account"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
          already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            sign in
          </Link>
        </p>
      </form>
    </>
  );
}
