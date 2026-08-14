"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  style?: React.CSSProperties;
}

const POPUP_WIDTH = 260;
const MAX_HEIGHT = 280;

export default function Select({ value, onChange, options, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const alignRight = rect.left + POPUP_WIDTH > window.innerWidth - 16;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const upward = spaceBelow < MAX_HEIGHT && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(MAX_HEIGHT, upward ? spaceAbove : spaceBelow));

      setPopupStyle({
        position: "fixed",
        ...(alignRight ? { right: window.innerWidth - rect.right } : { left: rect.left }),
        ...(upward ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        maxHeight,
      });
    }
    setOpen(true);
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
        <span className="truncate" style={{ color: "inherit" }}>
          {selected?.label ?? value}
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-60" style={{ marginLeft: "6px" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[149]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[150] rounded-2xl p-1.5 overflow-y-auto"
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
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-sm transition-colors hover:bg-[var(--bg)]"
                  style={{
                    color: isSelected ? "var(--primary)" : "var(--text-1)",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--primary)" strokeWidth="2.5" className="shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
