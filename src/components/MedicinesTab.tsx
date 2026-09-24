"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import Select from "@/components/Select";
import DatePicker from "@/components/DatePicker";
import { INVENTORY_UNITS, INVENTORY_LOCATIONS, MEDICINE_NAMES } from "@/lib/constants";
import ConfirmModal from "@/components/ConfirmModal";
import { inputStyle, Field, StatCard, fmt, SplitRow, useViewportHeight, UsageEntry, ReportItem } from "@/components/inventory-ui";
import InventoryReports from "@/components/InventoryReports";

interface MedicineAssignment {
  nurseId: number;
  nurseName: string;
  qty: number;
}

interface MedicineLocation {
  location: string;
  qty: number;
}

interface Medicine {
  id: number;
  name: string;
  qty: number;
  used: number;
  unit: string;
  expiry: string | null;
  createdAt: string;
  usages: UsageEntry[];
  locations: MedicineLocation[];
  assignments: MedicineAssignment[];
}

interface NurseOption {
  id: number;
  name: string;
  isActive: boolean;
}

// Bulk "master" medicines held in the office inventory. Admins manage everything; nurses see
// a read-only view of just what's been assigned to them.
export default function MedicinesTab({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Medicine[]>([]);
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [toDelete, setToDelete] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [{ today, weekAway }] = useState(() => ({
    today: new Date().toISOString().slice(0, 10),
    weekAway: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  }));

  const load = useCallback(() => {
    return api.medicines
      .list()
      .then(setItems)
      .catch(() => toast("Failed to load medicines"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    if (isAdmin) api.nurses.list().then(setNurses).catch(() => {});
  }, [load, isAdmin]);

  const q = search.toLowerCase();
  const statusOptions = [
    { label: "All Status", value: "" },
    { label: "Expired", value: "expired" },
  ];
  const nameOptions = [
    { label: "All Medicines", value: "" },
    ...Array.from(new Set(items.map((m) => m.name))).sort().map((n) => ({ label: n, value: n })),
  ];
  const filtered = items
    .filter((m) => {
      if (!m.name.toLowerCase().includes(q)) return false;
      if (nameFilter && m.name !== nameFilter) return false;
      const expired = !!m.expiry && m.expiry < today;
      // Expired medicines clutter the default view — they only show up once "Expired" is picked.
      if (statusFilter === "expired") return expired;
      if (statusFilter === "") return !expired;
      return true;
    })
    // Within the default view, surface anything expiring in the next week first.
    .sort((a, b) => {
      if (statusFilter !== "") return 0;
      const aSoon = !!a.expiry && a.expiry >= today && a.expiry <= weekAway;
      const bSoon = !!b.expiry && b.expiry >= today && b.expiry <= weekAway;
      return Number(bSoon) - Number(aSoon);
    });
  // Stats reflect whatever's currently filtered, not the whole inventory.
  const totalQty = filtered.reduce((s, m) => s + m.qty, 0);
  const totalUsed = filtered.reduce((s, m) => s + m.used, 0);
  // Stat totals only make sense in one unit; the app's default is ml.
  const unit = filtered.length && filtered.every((m) => m.unit === filtered[0].unit) ? filtered[0].unit : "ml";

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.medicines.remove(toDelete.id);
      toast("Medicine deleted");
      setToDelete(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  function exportMedicines() {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const link = document.createElement("a");
    link.href = api.medicines.exportUrl(params);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const reportItems: ReportItem[] = items.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    qty: m.qty,
    used: m.used,
    expiry: m.expiry,
    createdAt: m.createdAt,
    locationSummary: m.locations.length ? m.locations.map((l) => `${l.location} (${fmt(l.qty)})`).join(", ") : undefined,
    assignments: m.assignments,
    usages: m.usages,
  }));

  return (
    <div className="p-4 space-y-4">
      {isAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Medicines" value={filtered.length} color="var(--primary-text)" />
          <StatCard label="Master Qty" value={`${fmt(totalQty)} ${unit}`} color="var(--text-1)" />
          <StatCard label="Used" value={`${fmt(totalUsed)} ${unit}`} color="#e65100" />
          <StatCard label="Available" value={`${fmt(totalQty - totalUsed)} ${unit}`} color="#27ae60" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Medicines" value={filtered.length} color="var(--primary-text)" />
          <StatCard label="Total Qty" value={`${fmt(totalQty)} ${unit}`} color="#27ae60" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold" style={{ color: "var(--text-1)" }}>
          {isAdmin ? "Master Medicines (Office Inventory)" : "My Medicines"}
        </h2>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowReports(true)}
              title="Reports"
              className="h-9 w-9 rounded-xl flex items-center justify-center border transition-colors hover:brightness-90"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 17V9M13 17v-5M17 17v-9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={exportMedicines}
              title="Export"
              className="h-9 w-9 rounded-xl flex items-center justify-center border transition-colors hover:brightness-90"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-2 rounded-xl border-2 text-[13px] font-semibold"
              style={{ borderColor: "var(--primary-text)", color: "var(--primary-text)" }}
            >
              + Add Medicine
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search medicine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={inputStyle}
        />
        <Select
          value={nameFilter}
          onChange={setNameFilter}
          options={nameOptions}
          className="px-4 py-2.5 rounded-2xl border outline-none text-sm"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      </div>

      <Select
        value={statusFilter}
        onChange={setStatusFilter}
        options={statusOptions}
        className="px-4 py-2.5 rounded-2xl border outline-none text-sm"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />

      {loading ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>
          {items.length === 0
            ? isAdmin
              ? "No medicines yet. Add one to get started."
              : "No medicines assigned to you."
            : "No matching medicines."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((m) => {
            const available = Math.max(0, m.qty - m.used);
            const usedPct = m.qty > 0 ? Math.min(100, (m.used / m.qty) * 100) : 0;
            const expired = !!m.expiry && m.expiry < today;
            const daysLeft = m.expiry ? Math.round((new Date(m.expiry).getTime() - new Date(today).getTime()) / 86400000) : null;
            const expiringSoon = !expired && daysLeft !== null && daysLeft <= 7;
            const expiringLabel = daysLeft === 0 ? "Expires Today" : daysLeft === 1 ? "Expires in 1 Day" : `Expires in ${daysLeft} Days`;
            const badge = expired
              ? { label: "Expired", bg: "rgba(198,40,40,0.14)", color: "#c62828" }
              : available <= 0
                ? { label: "Out of stock", bg: "rgba(198,40,40,0.14)", color: "#c62828" }
                : expiringSoon
                  ? { label: expiringLabel, bg: "#fff3e0", color: "#e65100" }
                  : m.qty > 0 && available / m.qty < 0.2
                    ? { label: "Low stock", bg: "#fff3e0", color: "#e65100" }
                    : { label: "In stock", bg: "rgba(39,174,96,0.14)", color: "#27ae60" };

            return (
              <div key={m.id} className="rounded-2xl border p-3 h-full" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div
                  className={`flex items-start justify-between ${isAdmin ? "cursor-pointer" : ""}`}
                  onClick={isAdmin ? () => setExpanded(expanded === m.id ? null : m.id) : undefined}
                >
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{m.name}</p>
                    <p className="text-[11px]" style={{ color: expired ? "#c62828" : "var(--text-3)" }}>
                      Bulk · No Serial · {expired ? "Expired" : "Exp"}: {m.expiry ?? "—"}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setToDelete(m); }}
                        className="text-[11px] font-semibold"
                        style={{ color: "#c62828" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isAdmin ? (
                  <>
                    <div className="mt-2 w-full h-2 rounded-full overflow-hidden flex" style={{ background: "var(--border)" }}>
                      <div className="h-full" style={{ width: `${usedPct}%`, background: "#e65100" }} />
                      <div className="h-full" style={{ width: `${100 - usedPct}%`, background: "#27ae60" }} />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[11px] font-semibold">
                      <span style={{ color: "#27ae60" }}>{fmt(available)} {m.unit} available</span>
                      <span style={{ color: "var(--text-3)" }}>Master: {fmt(m.qty)} {m.unit}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {/* Open bookings only reserve stock; a completed booking makes it "used". */}
                      {m.usages.map((u) => (
                        <p key={u.bookingId} className="text-[11px] font-semibold" style={{ color: u.completed ? "#e65100" : "#3b82f6" }}>
                          {fmt(u.qty)} {m.unit} {u.completed ? "used" : "assigned"} for {u.taskId}
                        </p>
                      ))}
                      {m.used === 0 && (
                        <p className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>0 {m.unit} used for booking</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] font-semibold mt-2" style={{ color: "#27ae60" }}>{fmt(m.qty)} {m.unit} with you</p>
                )}

                {isAdmin && expanded === m.id && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                    {m.locations.length > 0 && (
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                        <span className="font-semibold" style={{ color: "var(--primary-text)" }}>Locations: </span>
                        {m.locations.map((l) => `${l.location} (${fmt(l.qty)})`).join(", ")}
                      </p>
                    )}
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      <span className="font-semibold" style={{ color: "var(--accent)" }}>Assigned: </span>
                      {m.assignments.length > 0
                        ? m.assignments.map((a) => `${a.nurseName} (${fmt(a.qty)})`).join(", ")
                        // Not held by a nurse — it's sitting at its location(s) instead, so show that rather than nothing.
                        : m.locations.length > 0
                          ? m.locations.map((l) => l.location).join(", ")
                          : "Unassigned"}
                    </p>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setEditing(m)} className="text-[12px] font-semibold" style={{ color: "var(--primary-text)" }}>Edit medicine details</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <MedicineFormModal nurses={nurses.filter((n) => n.isActive)} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {toDelete && (
        <ConfirmModal
          title="Delete medicine?"
          message={`${toDelete.name} will be removed from bulk inventory. This can't be undone.`}
          onConfirm={remove}
          onClose={() => !deleting && setToDelete(null)}
          loading={deleting}
        />
      )}
      {editing && (
        <MedicineFormModal
          medicine={editing}
          // Active nurses, plus anyone inactive who still holds a split here — otherwise saving
          // the edit would silently drop their existing assignment since they'd never be submitted.
          nurses={[
            ...nurses.filter((n) => n.isActive),
            ...nurses.filter((n) => !n.isActive && editing.assignments.some((a) => a.nurseId === n.id)),
          ]}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {showReports && <InventoryReports title="Medicine Reports" items={reportItems} onClose={() => setShowReports(false)} />}
    </div>
  );
}

// How much of the master quantity is still unclaimed once every other location/nurse row is counted —
// locations and nurses draw from the same pool, so this is checked against their combined total, not per section.
function remainingFor(rowValue: string, combinedTotal: number, master: number): number {
  const others = combinedTotal - (Number(rowValue) || 0);
  return Math.max(0, Math.round((master - others) * 100) / 100);
}

function MedicineFormModal({ medicine, nurses, onClose, onSaved }: { medicine?: Medicine; nurses: NurseOption[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!medicine;
  const [form, setForm] = useState({
    name: medicine?.name ?? MEDICINE_NAMES[0],
    qty: medicine ? String(medicine.qty) : "",
    unit: medicine?.unit ?? INVENTORY_UNITS[0],
    expiry: medicine?.expiry ?? "",
  });
  // Split rows, keyed by location/nurse id, kept as strings for the inputs. Pre-filled from the
  // medicine's existing split when editing, so it can be adjusted rather than starting blank.
  const [locationQty, setLocationQty] = useState<Record<string, string>>(() =>
    Object.fromEntries((medicine?.locations ?? []).map((l) => [l.location, String(l.qty)]))
  );
  const [nurseQty, setNurseQty] = useState<Record<number, string>>(() =>
    Object.fromEntries((medicine?.assignments ?? []).map((a) => [a.nurseId, String(a.qty)]))
  );
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  // Keep a medicine's existing name selectable even if it isn't in the presets.
  const nameOptions = Array.from(new Set([...MEDICINE_NAMES, ...(medicine?.name ? [medicine.name] : [])]));
  const unitOptions = Array.from(new Set([...INVENTORY_UNITS, form.unit]));
  const field = "w-full px-4 py-3 rounded-2xl border outline-none text-[15px]";
  const fieldStyle = { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" };
  const masterQty = Number(form.qty) || 0;
  const locationTotal = Object.values(locationQty).reduce((s, v) => s + (Number(v) || 0), 0);
  const nurseTotal = Object.values(nurseQty).reduce((s, v) => s + (Number(v) || 0), 0);
  // Locations and nurses aren't separate pools — both draw from the same master quantity.
  const combinedTotal = locationTotal + nurseTotal;
  const viewportHeight = useViewportHeight();

  function close(after: () => void) {
    setClosing(true);
    setTimeout(after, 200);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, unknown> = { ...form, qty: Number(form.qty), expiry: form.expiry || null };
      data.locations = INVENTORY_LOCATIONS.map((location) => ({ location, qty: Number(locationQty[location] || 0) }));
      data.nurseAssignments = nurses.map((n) => ({ nurseId: n.id, qty: Number(nurseQty[n.id] || 0) }));
      if (medicine) {
        await api.medicines.update(medicine.id, data);
      } else {
        await api.medicines.create(data);
      }
      toast(isEdit ? "Medicine updated" : "Medicine added");
      close(onSaved);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save medicine");
      setSaving(false);
    }
  }

  // Portaled to <body>: `<main>` scrolls with iOS's momentum-scroll style, which traps nested
  // position:fixed elements and breaks their stacking order against page furniture like the FAB.
  return createPortal(
    <div
      className="fixed inset-0 flex items-start sm:items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 200, animation: `${closing ? "fadeOut" : "fadeIn"} 0.2s ease forwards` }}
      onClick={() => close(onClose)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl p-4 sm:p-6 space-y-4"
        style={{
          background: "var(--bg)",
          // A measured px height (not vh/dvh/max-h-full) so the card is reliably capped to what's
          // actually visible, including installed PWAs where viewport units can't be trusted.
          // Anchored near the top (not centered) so overflow can only push the bottom off-screen,
          // never the header. The extra 40px leaves room for iOS's home-indicator gesture bar,
          // which otherwise overlaps the last bit of content right at the screen edge.
          maxHeight: Math.max(200, viewportHeight - 24 - 40),
          marginTop: "max(0px, env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          WebkitOverflowScrolling: "touch",
          animation: `${closing ? "popOut" : "popIn"} 0.2s ease forwards`,
        }}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>{isEdit ? "Edit Bulk Medicine" : "Add Bulk Medicine"}</h3>
          <button type="button" onClick={() => close(onClose)} aria-label="Close" className="p-1" style={{ color: "var(--text-3)" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <Field label="Medicine Name">
          <Select value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} options={nameOptions.map((n) => ({ label: n, value: n }))} className={field} style={fieldStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Master Quantity">
            <input required type="number" min="0" step="0.5" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="300" className={field} style={fieldStyle} />
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} options={unitOptions.map((u) => ({ label: u, value: u }))} className={field} style={fieldStyle} />
          </Field>
        </div>
        <Field label="Expiry Date">
          <DatePicker value={form.expiry} onChange={(v) => setForm((f) => ({ ...f, expiry: v }))} className={field} style={fieldStyle} />
        </Field>

        <>
            <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mt-4 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Total Allocated</p>
                <p className="text-[11px] font-semibold" style={{ color: combinedTotal > masterQty ? "#c62828" : "var(--text-3)" }}>{fmt(combinedTotal)} / {fmt(masterQty)} {form.unit}</p>
              </div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--primary-text)" }}>
                Split Across Locations
              </p>
              <div className="space-y-2.5">
                {/* INVENTORY_LOCATIONS is the single source of truth for locations across the app (src/lib/constants.ts). */}
                {INVENTORY_LOCATIONS.map((location) => (
                  <SplitRow
                    key={location}
                    label={location}
                    value={locationQty[location] ?? ""}
                    max={remainingFor(locationQty[location] ?? "", combinedTotal, masterQty)}
                    onChange={(v) => setLocationQty((f) => ({ ...f, [location]: v }))}
                  />
                ))}
              </div>
            </div>

            {nurses.length > 0 && (
              <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] mt-4 mb-2" style={{ color: "var(--accent)" }}>
                  Assign to Nurses
                </p>
                <div className="space-y-2.5">
                  {nurses.map((n) => (
                    <SplitRow
                      key={n.id}
                      label={n.name}
                      value={nurseQty[n.id] ?? ""}
                      max={remainingFor(nurseQty[n.id] ?? "", combinedTotal, masterQty)}
                      onChange={(v) => setNurseQty((f) => ({ ...f, [n.id]: v }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </>

        <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl text-base font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Medicine"}
        </button>
      </form>
    </div>,
    document.body
  );
}
