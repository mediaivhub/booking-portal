"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { fmt, ReportItem } from "@/components/inventory-ui";

// Full report view for either vials or bulk medicines: every item's stock, location, who it's
// assigned to, when it was added, and its complete booking usage history.
export default function InventoryReports({ title, items, onClose }: { title: string; items: ReportItem[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = items.filter((i) => i.name.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q));
  const today = new Date().toISOString().slice(0, 10);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col animate-[slideUp_0.3s_ease]" style={{ background: "var(--bg-card)" }}>
      <div
        className="flex items-center justify-between px-4"
        style={{ background: "var(--primary)", padding: "16px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}
      >
        <span className="font-bold text-[17px] text-white">{title}</span>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}>
        {filtered.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>No matching items.</p>
        )}
        {filtered.map((item) => {
          const available = Math.max(0, Math.round((item.qty - item.used) * 100) / 100);
          const expired = !!item.expiry && item.expiry < today;
          return (
            <div key={item.id} className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{item.name}</p>
                  <p className="text-[11px]" style={{ color: expired ? "#c62828" : "var(--text-3)" }}>
                    {item.subtitle ? `${item.subtitle} · ` : ""}
                    {expired ? "Expired" : "Exp"}: {item.expiry ?? "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold" style={{ color: "#27ae60" }}>{fmt(available)} {item.unit} avl</p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>of {fmt(item.qty)} {item.unit}</p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                <p><span style={{ color: "var(--text-3)" }}>Added: </span>{new Date(item.createdAt).toLocaleDateString("en-GB")}</p>
                {item.locationSummary && <p><span style={{ color: "var(--text-3)" }}>Location: </span>{item.locationSummary}</p>}
              </div>

              <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--primary-text)" }}>Assigned</p>
                {item.assignments.length === 0 ? (
                  // Not held by a nurse — it's sitting at its location instead, so show that rather than a bare "Unassigned".
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{item.locationSummary || "Unassigned"}</p>
                ) : (
                  <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                    {item.assignments.map((a) => `${a.nurseName} (${fmt(a.qty)})`).join(", ")}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-2 border-t space-y-0.5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>Usage History</p>
                {item.usages.length === 0 ? (
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No bookings yet</p>
                ) : (
                  item.usages.map((u) => (
                    <p key={u.bookingId} className="text-[12px] font-semibold flex flex-wrap justify-between gap-x-3" style={{ color: u.completed ? "#e65100" : "#3b82f6" }}>
                      <span>{fmt(u.qty)} {item.unit} {u.completed ? "used" : "reserved"} for {u.taskId}{u.nurseName ? ` (${u.nurseName})` : ""}</span>
                      <span style={{ color: "var(--text-3)" }}>{u.date ?? "—"}</span>
                    </p>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
