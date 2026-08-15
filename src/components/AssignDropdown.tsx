"use client";

import { useState } from "react";

interface Nurse {
  id: number;
  name: string;
  initials?: string;
}

interface Props {
  nurses: Nurse[];
  currentNurseId?: number;
  onSelect: (nurseId: number) => void;
  onClose: () => void;
}

export default function AssignDropdown({ nurses, currentNurseId, onSelect, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(currentNurseId ?? null);

  function handleDone() {
    if (selectedId == null) return;
    onSelect(selectedId);
  }

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl animate-[slideUp_0.25s_ease] flex flex-col"
        style={{ background: "var(--bg-card)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Assign Nurse</h3>
            <button
              type="button"
              disabled={selectedId == null}
              onClick={handleDone}
              className="text-sm font-bold disabled:opacity-40"
              style={{ color: "var(--primary-mid)" }}
            >
              Done
            </button>
          </div>
        </div>
        <div
          className="space-y-1 overflow-y-auto px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
        >
          {nurses.map((nurse) => {
            const isSelected = selectedId === nurse.id;
            return (
              <button
                key={nurse.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                onClick={() => setSelectedId(nurse.id)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: "var(--primary)" }}
                >
                  {nurse.initials || nurse.name.split(" ").map((w) => w[0]).join("").toUpperCase()}
                </div>
                <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>{nurse.name}</span>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                    background: isSelected ? "var(--primary)" : "transparent",
                  }}
                >
                  {isSelected && (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
