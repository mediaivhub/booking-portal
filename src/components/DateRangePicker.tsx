"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  style?: React.CSSProperties;
  /** ISO date string (YYYY-MM-DD) — days before this are shown disabled and can't be selected. */
  minDate?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function buildCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean; date: Date }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(year, month, d) });
  }
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next, current: false, date: new Date(year, month + 1, next) });
    next++;
  }
  return cells;
}

export default function DateRangePicker({ from, to, onChange, className, style, minDate }: Props) {
  const fromDate = from ? new Date(from + "T00:00:00") : null;
  const toDate = to ? new Date(to + "T00:00:00") : null;
  const minDateObj = minDate ? new Date(minDate + "T00:00:00") : null;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const [viewDate, setViewDate] = useState(fromDate || new Date());
  const [yearRangeStart, setYearRangeStart] = useState(() => (fromDate || new Date()).getFullYear() - 6);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const today = new Date();
  const POPUP_WIDTH = 300;
  const POPUP_HEIGHT = 420;

  function displayLabel() {
    if (fromDate && toDate) return `${formatShort(fromDate)} – ${formatShort(toDate)}`;
    if (fromDate) return `${formatShort(fromDate)} – ...`;
    return null;
  }

  function openPicker() {
    setViewDate(fromDate || new Date());
    setMode("days");
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

  function openMonthPicker() {
    setMode("months");
  }

  function openYearPicker() {
    setYearRangeStart(viewDate.getFullYear() - 6);
    setMode("years");
  }

  function handleDayClick(date: Date) {
    const iso = toISO(date);
    if (!fromDate || (fromDate && toDate)) {
      // Start a fresh range.
      onChange(iso, "");
    } else if (date < fromDate) {
      onChange(iso, toISO(fromDate));
      setOpen(false);
    } else {
      onChange(toISO(fromDate), iso);
      setOpen(false);
    }
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
        <span style={{ color: fromDate ? "var(--text-1)" : "var(--text-3)" }}>
          {displayLabel() || "dd/mm/yyyy – dd/mm/yyyy"}
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text-3)" strokeWidth="2" className="shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[251] rounded-2xl p-4 overflow-y-auto"
            style={{
              ...popupStyle,
              width: "300px",
              maxWidth: "calc(100vw - 32px)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg, var(--shadow-md))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              {mode === "years" ? (
                <span className="text-sm font-bold px-1.5 py-1" style={{ color: "var(--text-1)" }}>
                  {yearRangeStart} – {yearRangeStart + 11}
                </span>
              ) : (
                <div className="flex items-center gap-1 -ml-1.5">
                  <button
                    type="button"
                    onClick={openMonthPicker}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--bg)]"
                  >
                    <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                      {MONTHS[viewDate.getMonth()]}
                    </span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={openYearPicker}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--bg)]"
                  >
                    <span className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                      {viewDate.getFullYear()}
                    </span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
              )}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "days") setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
                    else if (mode === "months") setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
                    else setYearRangeStart((y) => y - 12);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg)]"
                  style={{ color: "var(--text-2)" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "days") setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
                    else if (mode === "months") setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
                    else setYearRangeStart((y) => y + 12);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg)]"
                  style={{ color: "var(--text-2)" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>

            {mode === "days" && (
              <div className="text-[11px] mb-2" style={{ color: "var(--text-3)" }}>
                {!fromDate ? "Select a start date" : !toDate ? "Select an end date" : "Tap a date to start a new range"}
              </div>
            )}

            {mode === "months" ? (
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((m, i) => {
                  const isSelectedMonth = i === viewDate.getMonth();
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewDate(new Date(viewDate.getFullYear(), i, 1));
                        setMode("days");
                      }}
                      className="py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg)]"
                      style={{
                        color: isSelectedMonth ? "#fff" : "var(--text-1)",
                        background: isSelectedMonth ? "var(--primary)" : "transparent",
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : mode === "years" ? (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((y) => {
                  const isSelectedYear = y === viewDate.getFullYear();
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewDate(new Date(y, viewDate.getMonth(), 1));
                        setMode("days");
                      }}
                      className="py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg)]"
                      style={{
                        color: isSelectedYear ? "#fff" : "var(--text-1)",
                        background: isSelectedYear ? "var(--primary)" : "transparent",
                      }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-3)" }}>{w}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDate(null)}>
                  {buildCells(viewDate).map((c, i) => {
                    const isFrom = isSameDay(c.date, fromDate);
                    const isTo = isSameDay(c.date, toDate);
                    const isToday = isSameDay(c.date, today);
                    const isDisabled = !!minDateObj && c.date < minDateObj;
                    const previewEnd = toDate || hoverDate;
                    const inRange = !!fromDate && !!previewEnd && c.date > (fromDate < previewEnd ? fromDate : previewEnd) && c.date < (fromDate < previewEnd ? previewEnd : fromDate);
                    const isEndpoint = isFrom || isTo;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isDisabled}
                        onMouseEnter={() => setHoverDate(c.date)}
                        onClick={() => handleDayClick(c.date)}
                        className="aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors hover:bg-[var(--bg)] disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        style={{
                          color: isDisabled ? "var(--text-3)" : isEndpoint ? "#fff" : !c.current ? "var(--text-3)" : "var(--text-1)",
                          background: isEndpoint ? "var(--primary)" : inRange ? "color-mix(in srgb, var(--primary) 18%, transparent)" : "transparent",
                          border: isToday && !isEndpoint ? "1px solid var(--primary)" : "1px solid transparent",
                          opacity: isDisabled ? 0.25 : !c.current ? 0.4 : 1,
                        }}
                      >
                        {c.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  onChange("", "");
                  setOpen(false);
                }}
                className="text-xs font-semibold"
                style={{ color: "var(--status-cancelled)" }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold"
                style={{ color: "var(--primary-mid)" }}
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
