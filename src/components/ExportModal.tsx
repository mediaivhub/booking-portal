"use client";

import { useState } from "react";
import DateRangePicker from "./DateRangePicker";

interface Props {
  onClose: () => void;
  onExport: (range: { dateFrom?: string; dateTo?: string }) => void;
}

function RadioOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border transition-colors"
      style={{
        borderColor: selected ? "var(--primary)" : "var(--border)",
        background: selected ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
      }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ border: `2px solid ${selected ? "var(--primary)" : "var(--border)"}` }}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} />}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{label}</span>
    </button>
  );
}

export default function ExportModal({ onClose, onExport }: Props) {
  const [mode, setMode] = useState<"all" | "range">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canExport = mode === "all" || (!!dateFrom && !!dateTo);

  function handleExport() {
    if (!canExport) return;
    onExport(mode === "range" ? { dateFrom, dateTo } : {});
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 animate-[popIn_0.2s_ease]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-1)" }}>Export Bookings</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>Choose what to include in the Excel file.</p>

        <div className="space-y-2 mb-4">
          <RadioOption label="All Data" selected={mode === "all"} onClick={() => setMode("all")} />
          <RadioOption label="Custom Date Range" selected={mode === "range"} onClick={() => setMode("range")} />
        </div>

        {mode === "range" && (
          <div className="mb-4">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
              className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-2)" }}
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            Export
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
      </div>
    </div>
  );
}
