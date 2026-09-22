// Small pieces shared by the vial and bulk-medicine views of the Inventory tab.

import { useEffect, useState } from "react";

export const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" };

// The real visible viewport height in px, kept live. CSS `dvh` should handle this, but support is
// inconsistent in some mobile/installed-PWA webviews, which was letting tall modals render taller
// than what's actually visible and pushing their header off the top of the screen. Measuring it in
// JS via visualViewport (falls back to innerHeight) sidesteps that entirely.
//
// The on-screen keyboard also fires a visualViewport resize (shrinking it by 250-350px), which was
// making the modal's height collapse the instant a field was focused — fighting the browser's own
// "scroll the focused input into view" behavior and producing a jarring double jump. A keyboard-sized
// shrink is ignored here so the modal keeps its pre-keyboard height and lets the normal scroll-into-view
// behavior work inside it, same as a modal that never tried to react to the keyboard at all.
export function useViewportHeight() {
  const [height, setHeight] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (vv && window.innerHeight - vv.height > 150) return;
      setHeight(vv?.height ?? window.innerHeight);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return height;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: "var(--text-3)" }}>{label}</span>
      {children}
    </label>
  );
}

export function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border p-2 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</p>
    </div>
  );
}

export function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}

// A "<label> ... [qty input]" row used to split a quantity across locations or nurses.
// `max` is advisory only: entry isn't blocked, but a row over its share is flagged in red.
export function SplitRow({ label, value, max, onChange }: { label: string; value: string; max?: number; onChange: (v: string) => void }) {
  const over = max !== undefined && value !== "" && Number(value) > max;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        {/* min-w-0 lets a long name wrap/shrink instead of forcing the row to overflow on narrow screens. */}
        <span className="text-[14px] min-w-0 flex-1 break-words" style={{ color: "var(--text-1)" }}>{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="0"
            step="0.5"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="w-20 sm:w-28 px-2.5 sm:px-3 py-1.5 rounded-lg border outline-none text-sm text-right"
            style={over ? { ...inputStyle, borderColor: "#c62828" } : inputStyle}
          />
          <span className="text-[11px]" style={{ color: "var(--text-3)" }}>qty</span>
        </div>
      </div>
      {over && (
        <p className="text-[11px] text-right mt-0.5" style={{ color: "#c62828" }}>Only {max} available</p>
      )}
    </div>
  );
}
