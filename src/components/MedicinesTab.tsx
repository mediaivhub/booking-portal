"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import Select from "@/components/Select";
import DatePicker from "@/components/DatePicker";
import { INVENTORY_UNITS, INVENTORY_LOCATIONS } from "@/lib/constants";
import ConfirmModal from "@/components/ConfirmModal";
import { inputStyle, Field, StatCard, fmt, SplitRow } from "@/components/inventory-ui";

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
  usages: { bookingId: number; taskId: string; qty: number; completed: boolean }[];
  locations: MedicineLocation[];
  assignments: MedicineAssignment[];
}

interface NurseOption {
  id: number;
  name: string;
  isActive: boolean;
}

// Bulk "master" medicines held in the office inventory (admin only).
export default function MedicinesTab() {
  const [items, setItems] = useState<Medicine[]>([]);
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [toDelete, setToDelete] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(() => {
    return api.medicines
      .list()
      .then(setItems)
      .catch(() => toast("Failed to load medicines"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.nurses.list().then(setNurses).catch(() => {});
  }, [load]);

  const q = search.toLowerCase();
  const filtered = items.filter((m) => m.name.toLowerCase().includes(q));
  const totalQty = items.reduce((s, m) => s + m.qty, 0);
  const totalUsed = items.reduce((s, m) => s + m.used, 0);
  // Stat totals only make sense in one unit; the app's default is ml.
  const unit = items.length && items.every((m) => m.unit === items[0].unit) ? items[0].unit : "ml";

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

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Medicines" value={items.length} color="var(--primary-text)" />
        <StatCard label="Master Qty" value={`${fmt(totalQty)} ${unit}`} color="var(--text-1)" />
        <StatCard label="Used" value={`${fmt(totalUsed)} ${unit}`} color="#e65100" />
        <StatCard label="Available" value={`${fmt(totalQty - totalUsed)} ${unit}`} color="#27ae60" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Master Medicines (Office Inventory)</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 px-3 py-2 rounded-xl border-2 text-[13px] font-semibold"
          style={{ borderColor: "var(--primary-text)", color: "var(--primary-text)" }}
        >
          + Add Medicine
        </button>
      </div>

      <input
        type="text"
        placeholder="Search medicine..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
        style={inputStyle}
      />

      {loading ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>
          {items.length === 0 ? "No medicines yet. Add one to get started." : "No matching medicines."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((m) => {
            const available = Math.max(0, m.qty - m.used);
            const usedPct = m.qty > 0 ? Math.min(100, (m.used / m.qty) * 100) : 0;
            const expired = !!m.expiry && m.expiry < today;
            const badge = expired
              ? { label: "Expired", bg: "rgba(198,40,40,0.14)", color: "#c62828" }
              : available <= 0
                ? { label: "Out of stock", bg: "rgba(198,40,40,0.14)", color: "#c62828" }
                : m.qty > 0 && available / m.qty < 0.2
                  ? { label: "Low stock", bg: "#fff3e0", color: "#e65100" }
                  : { label: "In stock", bg: "rgba(39,174,96,0.14)", color: "#27ae60" };

            return (
              <div key={m.id} className="rounded-2xl border p-3 h-full" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{m.name}</p>
                    <p className="text-[11px]" style={{ color: expired ? "#c62828" : "var(--text-3)" }}>
                      Bulk · No Serial · {expired ? "Expired" : "Exp"}: {m.expiry ?? "—"}
                    </p>
                  </div>
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
                </div>

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

                {expanded === m.id && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                    {m.locations.length > 0 && (
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                        <span className="font-semibold" style={{ color: "var(--primary-text)" }}>Locations: </span>
                        {m.locations.map((l) => `${l.location} (${fmt(l.qty)})`).join(", ")}
                      </p>
                    )}
                    {m.assignments.length > 0 && (
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                        <span className="font-semibold" style={{ color: "var(--accent)" }}>Assigned: </span>
                        {m.assignments.map((a) => `${a.nurseName} (${fmt(a.qty)})`).join(", ")}
                      </p>
                    )}
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
      {editing && <MedicineFormModal medicine={editing} nurses={[]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
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
    name: medicine?.name ?? "",
    qty: medicine ? String(medicine.qty) : "",
    unit: medicine?.unit ?? INVENTORY_UNITS[0],
    expiry: medicine?.expiry ?? "",
  });
  // Split rows only apply when creating a new medicine; keyed by location/nurse id, kept as strings for the inputs.
  const [locationQty, setLocationQty] = useState<Record<string, string>>({});
  const [nurseQty, setNurseQty] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const unitOptions = Array.from(new Set([...INVENTORY_UNITS, form.unit]));
  const field = "w-full px-4 py-3 rounded-2xl border outline-none text-[15px]";
  const fieldStyle = { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" };
  const masterQty = Number(form.qty) || 0;
  const locationTotal = Object.values(locationQty).reduce((s, v) => s + (Number(v) || 0), 0);
  const nurseTotal = Object.values(nurseQty).reduce((s, v) => s + (Number(v) || 0), 0);
  // Locations and nurses aren't separate pools — both draw from the same master quantity.
  const combinedTotal = locationTotal + nurseTotal;

  function close(after: () => void) {
    setClosing(true);
    setTimeout(after, 200);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, unknown> = { ...form, qty: Number(form.qty), expiry: form.expiry || null };
      if (medicine) {
        await api.medicines.update(medicine.id, data);
      } else {
        data.locations = INVENTORY_LOCATIONS.map((location) => ({ location, qty: Number(locationQty[location] || 0) }));
        data.nurseAssignments = nurses.map((n) => ({ nurseId: n.id, qty: Number(nurseQty[n.id] || 0) }));
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
      className="fixed inset-0 flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 200, animation: `${closing ? "fadeOut" : "fadeIn"} 0.2s ease forwards` }}
      onClick={() => close(onClose)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl p-4 sm:p-6 space-y-4"
        style={{
          background: "var(--bg)",
          // dvh (not vh/max-h-full) so the card is capped to what's actually visible on mobile,
          // including installed PWAs where the ancestor's resolved height can't be trusted.
          maxHeight: "calc(100dvh - 24px)",
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
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Glutathione 200mg/ml" className={field} style={fieldStyle} />
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

        {!isEdit && (
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
        )}

        <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl text-base font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Medicine"}
        </button>
      </form>
    </div>,
    document.body
  );
}
