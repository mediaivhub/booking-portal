"use client";

import { STATUS_CONFIG } from "./StatusBadge";

const STATUSES = [
  { key: "assigned", label: "Assigned", action: "Assigned" },
  { key: "ontheway", label: "On the Way", action: "On the Way" },
  { key: "progress", label: "In Progress", action: "Started" },
  { key: "completed", label: "Completed", action: "Completed" },
  { key: "cancelled", label: "Cancelled", action: "Cancelled" },
];

interface Props {
  currentStatus: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}

export default function StatusDropdown({ currentStatus, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 animate-[slideUp_0.25s_ease]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Update Status</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:brightness-90"
            style={{ background: "var(--bg)", color: "var(--text-3)" }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="space-y-1.5">
          {STATUSES.map((s) => {
            const config = STATUS_CONFIG[s.key];
            const isCurrent = currentStatus === s.key;
            return (
              <button
                key={s.key}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors disabled:cursor-default ${!isCurrent ? "hover:bg-[var(--bg)]" : ""}`}
                style={{
                  background: isCurrent ? "var(--bg)" : undefined,
                  border: `1px solid ${isCurrent ? "var(--border)" : "transparent"}`,
                }}
                onClick={() => onSelect(s.key)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: config?.color, opacity: isCurrent ? 0.5 : 1 }}
                />
                <span className="text-sm font-semibold" style={{ color: isCurrent ? "var(--text-3)" : "var(--text-1)" }}>
                  {s.label}
                </span>
                {isCurrent && (
                  <span
                    className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "var(--border)", color: "var(--text-3)" }}
                  >
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
