"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    router.push(role === "nurse" ? "/nurse" : "/admin");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "15px",
    color: "var(--text-1)",
    background: "var(--bg-card)",
    outline: "none",
    transition: "border-color 0.15s",
    WebkitAppearance: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)", padding: "20px" }}
    >
      <div
        className="w-full text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "36px 28px",
          maxWidth: "380px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.5}
            style={{ margin: "0 auto" }}
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          IV Wellness Lounge
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "24px" }}>
          Booking Assignment Portal
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col text-left" style={{ gap: "14px" }}>
          <div className="flex flex-col" style={{ gap: "5px" }}>
            <label style={labelStyle}>Email / Username</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="you@ivhub.com"
            />
          </div>

          <div className="flex flex-col" style={{ gap: "5px" }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col" style={{ gap: "5px" }}>
            <label style={labelStyle}>Login As</label>
            <select style={inputStyle} defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="nurse">Nurse</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold text-white transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              borderRadius: "var(--radius-sm)",
              padding: "14px",
              fontSize: "16px",
              marginTop: "4px",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
