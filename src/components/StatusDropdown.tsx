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
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 animate-[slideUp_0.25s_ease]"
        style={{ background: "var(--bg-card)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-1)" }}>Update Status</h3>
        <div className="space-y-1">
          {STATUSES.map((s) => {
            const config = STATUS_CONFIG[s.key];
            const isCurrent = currentStatus === s.key;
            return (
              <button
                key={s.key}
                disabled={isCurrent}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-40"
                style={{ color: isCurrent ? "var(--text-3)" : "var(--text-1)" }}
                onClick={() => onSelect(s.key)}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: config?.color }}
                />
                <span className="text-sm font-medium">{s.label}</span>
                {isCurrent && (
                  <span className="ml-auto text-xs" style={{ color: "var(--text-3)" }}>Current</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
