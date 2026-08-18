"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  value: string; // 24hr "HH:MM"
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

function to12(value: string) {
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr, 10) || 0;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { hour: String(h12).padStart(2, "0"), minute: mStr || "00", period };
}

function to24(hour: string, minute: string, period: string) {
  let hh = parseInt(hour, 10) % 12;
  if (period === "PM") hh += 12;
  return `${String(hh).padStart(2, "0")}:${minute}`;
}

function Column({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ maxHeight: "240px" }}>
      {options.map((opt) => {
        const isSelected = opt === selected;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--bg)]"
            style={{
              background: isSelected ? "var(--primary)" : "transparent",
              color: isSelected ? "#fff" : "var(--text-1)",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function TimePicker({ value, onChange, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const POPUP_WIDTH = 260;
  const POPUP_HEIGHT = 320;

  const { hour, minute, period } = to12(value);

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const alignRight = rect.left + POPUP_WIDTH > window.innerWidth - 16;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const upward = spaceBelow < POPUP_HEIGHT && spaceAbove > spaceBelow;
      const maxHeight = Math.max(200, Math.min(POPUP_HEIGHT, upward ? spaceAbove : spaceBelow));

      setPopupStyle({
        position: "fixed",
        ...(alignRight ? { right: window.innerWidth - rect.right } : { left: rect.left }),
        ...(upward ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        maxHeight,
      });
    }
    setOpen(true);
  }

  function displayLabel() {
    return `${hour}:${minute} ${period}`;
  }

  return (
    <div className="relative w-full flex-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={className}
        style={{ ...style, width: "100%", boxSizing: "border-box", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <span style={{ color: "var(--text-1)" }}>{displayLabel()}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text-3)" strokeWidth="2" className="shrink-0">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[251] rounded-2xl p-3"
            style={{
              ...popupStyle,
              width: `${POPUP_WIDTH}px`,
              maxWidth: "calc(100vw - 32px)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg, var(--shadow-md))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1.5 mb-2">
              <Column options={HOURS_12} selected={hour} onSelect={(h) => onChange(to24(h, minute, period))} />
              <Column options={MINUTES_60} selected={minute} onSelect={(m) => onChange(to24(hour, m, period))} />
              <Column options={PERIODS} selected={period} onSelect={(p) => onChange(to24(hour, minute, p))} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Done
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
