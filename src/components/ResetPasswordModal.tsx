"use client";

import { useState } from "react";

interface Props {
  nurseName: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function ResetPasswordModal({ nurseName, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    onSubmit(password);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 animate-[slideUp_0.25s_ease]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: "var(--border)" }} />
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-1)" }}>Reset Password</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>
          Set a new password for <strong style={{ color: "var(--text-2)" }}>{nurseName}</strong>. They&apos;ll need to use it on their next sign-in.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-2)" }}>
              New Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoFocus
              placeholder="At least 6 characters"
              className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--status-cancelled)" }}>{error}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Set Password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
