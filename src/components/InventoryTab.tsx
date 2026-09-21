"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import Select from "@/components/Select";
import DatePicker from "@/components/DatePicker";
import { INVENTORY_LOCATIONS, INVENTORY_UNITS } from "@/lib/constants";
import { inputStyle, Field, StatCard, fmt } from "@/components/inventory-ui";
import MedicinesTab from "@/components/MedicinesTab";

interface Assignment {
  nurseId: number;
  nurseName: string;
  qty: number;
}

interface Vial {
  id: number;
  name: string;
  serial: string;
  qty: number;
  assigned: number;
  used: number;
  usages: { bookingId: number; taskId: string; qty: number; completed: boolean }[];
  unit: string;
  expiry: string | null;
  location: string | null;
  assignments: Assignment[];
}

interface NurseOption {
  id: number;
  name: string;
  isActive: boolean;
}

function VialsTab({ isAdmin }: { isAdmin: boolean }) {
  const [vials, setVials] = useState<Vial[]>([]);
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Vial | null>(null);

  const load = useCallback(() => {
    return api.inventory
      .list()
      .then(setVials)
      .catch(() => toast("Failed to load inventory"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    if (isAdmin) api.nurses.list().then(setNurses).catch(() => {});
  }, [load, isAdmin]);

  const q = search.toLowerCase();
  const [{ today, soon }] = useState(() => ({
    today: new Date().toISOString().slice(0, 10),
    soon: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  }));
  const locationOptions = [
    { label: "All Locations", value: "" },
    ...Array.from(new Set([...INVENTORY_LOCATIONS, ...vials.map((v) => v.location).filter((l): l is string => !!l)])).map((l) => ({ label: l, value: l })),
  ];
  const statusOptions = [
    { label: "All Status", value: "" },
    ...(isAdmin
      ? [
          { label: "Available", value: "available" },
          { label: "Used Up", value: "usedup" },
          { label: "Assigned", value: "assigned" },
          { label: "Unassigned", value: "unassigned" },
        ]
      : []),
    { label: "Expiring Soon", value: "soon" },
    { label: "Expired", value: "expired" },
  ];

  const filtered = vials.filter((v) => {
    if (!(v.name.toLowerCase().includes(q) || v.serial.toLowerCase().includes(q))) return false;
    if (locationFilter && v.location !== locationFilter) return false;
    const expired = !!v.expiry && v.expiry < today;
    switch (statusFilter) {
      case "available": return !expired && v.qty - v.used > 0;
      case "usedup": return v.qty > 0 && v.qty - v.used <= 0;
      case "assigned": return v.assignments.length > 0;
      case "unassigned": return v.assignments.length === 0;
      case "soon": return !!v.expiry && !expired && v.expiry <= soon;
      case "expired": return expired;
      default: return true;
    }
  });

  const totalQty = vials.reduce((s, v) => s + v.qty, 0);
  const totalUsed = vials.reduce((s, v) => s + v.used, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>{isAdmin ? "Inventory" : "My Inventory"}</h2>
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{isAdmin ? "Vial stock, assignments and usage" : "Vials assigned to you"}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            + Add Vial
          </button>
        )}
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Vials" value={vials.length} color="var(--primary)" />
          <StatCard label="Total Qty" value={fmt(totalQty)} color="var(--text-1)" />
          <StatCard label="Used" value={fmt(totalUsed)} color="#e65100" />
          <StatCard label="Available" value={fmt(totalQty - totalUsed)} color="#27ae60" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Vials" value={vials.length} color="var(--primary)" />
          <StatCard label="Total Qty" value={fmt(totalQty)} color="#27ae60" />
        </div>
      )}

      <input
        type="text"
        placeholder="Search vials..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
        style={inputStyle}
      />

      <div className="flex gap-2">
        <Select value={locationFilter} onChange={setLocationFilter} options={locationOptions} className="px-4 py-2.5 rounded-2xl border outline-none text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" }} />
        <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="px-4 py-2.5 rounded-2xl border outline-none text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" }} />
      </div>

      {loading ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-3)" }}>
          {vials.length === 0 ? (isAdmin ? "No vials yet. Add one to get started." : "No vials assigned to you.") : "No matching vials."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((v) => (
            <VialCard
              key={v.id}
              vial={v}
              isAdmin={isAdmin}
              nurses={nurses.filter((n) => n.isActive)}
              open={expanded === v.id}
              onToggle={() => setExpanded(expanded === v.id ? null : v.id)}
              onEdit={() => setEditing(v)}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {showAdd && <VialFormModal nurses={nurses.filter((n) => n.isActive)} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <VialFormModal vial={editing} nurses={[]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function VialCard({
  vial: v, isAdmin, nurses, open, onToggle, onEdit, onChanged,
}: {
  vial: Vial; isAdmin: boolean; nurses: NurseOption[]; open: boolean; onToggle: () => void; onEdit: () => void; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const holder = v.assignments[0];
  const remaining = Math.max(0, v.qty - v.used);
  const usedPct = v.qty > 0 ? Math.min(100, (v.used / v.qty) * 100) : 0;
  const expired = v.expiry ? v.expiry < new Date().toISOString().slice(0, 10) : false;

  // A vial goes to one nurse whole; picking another nurse moves it, "Unassigned" releases it.
  async function assign(nurseId: string) {
    setBusy(true);
    try {
      await api.inventory.assign(v.id, nurseId ? Number(nurseId) : null);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${v.name} (${v.serial}) from inventory?`)) return;
    try {
      await api.inventory.remove(v.id);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  return (
    <div className="rounded-xl border p-3 h-full" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <div
        className={`flex items-start justify-between mb-2 ${isAdmin ? "cursor-pointer" : ""}`}
        onClick={isAdmin ? onToggle : undefined}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{v.name}</p>
          <p className="text-[11px]" style={{ color: expired ? "#c62828" : "var(--text-3)" }}>
            {v.serial} · {expired ? "Expired" : "Exp"}: {v.expiry ?? "—"}{v.location ? ` · ${v.location}` : ""}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2 text-right">
            <span className="text-[11px] font-semibold" style={{ color: holder ? "#3b82f6" : "var(--text-3)" }}>
              Currently with: {holder ? holder.nurseName : "Unassigned"}
            </span>
            {remaining <= 0 && v.qty > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ background: "#fff3e0", color: "#e65100" }}>
                USED UP
              </span>
            )}
          </div>
        )}
      </div>

      {isAdmin ? (
        <>
          <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: "var(--border)" }}>
            <div className="h-full" style={{ width: `${usedPct}%`, background: "#e65100" }} />
            <div className="h-full" style={{ width: `${100 - usedPct}%`, background: "#27ae60" }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] font-semibold">
            <span style={{ color: "#27ae60" }}>{fmt(remaining)} {v.unit} available</span>
            <span style={{ color: "var(--text-3)" }}>{fmt(v.qty)} {v.unit} total</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {/* Open bookings only reserve the vial; a completed booking makes it "used". */}
            {v.usages.map((u) => (
              <p key={u.bookingId} className="text-[11px] font-semibold" style={{ color: u.completed ? "#e65100" : "#3b82f6" }}>
                {fmt(u.qty)} {v.unit} {u.completed ? "used" : "assigned"} for {u.taskId}
              </p>
            ))}
            {v.used === 0 && (
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>0 {v.unit} used for booking</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-[13px] font-semibold" style={{ color: "#27ae60" }}>{fmt(v.qty)} {v.unit} with you</p>
      )}

      {isAdmin && open && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          <div className={busy ? "opacity-60 pointer-events-none" : ""}>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Assigned to</label>
            <Select
              value={holder ? String(holder.nurseId) : ""}
              onChange={assign}
              options={[{ label: "Unassigned", value: "" }, ...nurses.map((n) => ({ label: n.name, value: String(n.id) }))]}
              className="px-3 py-2 rounded-lg border outline-none text-[13px]"
              style={inputStyle}
            />
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            The whole vial goes to the nurse you pick. Choosing another nurse moves it.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={onEdit} className="text-[12px] font-semibold" style={{ color: "var(--primary-text)" }}>
              Edit vial details
            </button>
            <button onClick={remove} className="text-[12px] font-semibold" style={{ color: "#c62828" }}>
              Remove vial from inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VialFormModal({ vial, nurses, onClose, onSaved }: { vial?: Vial; nurses: NurseOption[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!vial;
  const [form, setForm] = useState({
    name: vial?.name ?? "",
    serial: vial?.serial ?? "",
    qty: vial ? String(vial.qty) : "10",
    unit: vial?.unit ?? INVENTORY_UNITS[0],
    expiry: vial?.expiry ?? "",
    nurseId: "",
    location: vial ? vial.location ?? "" : INVENTORY_LOCATIONS[0],
  });
  // Keep a vial's existing unit/location selectable even if it isn't in the presets.
  const unitOptions = Array.from(new Set([...INVENTORY_UNITS, form.unit]));
  const locationOptions = Array.from(new Set([...INVENTORY_LOCATIONS, ...(vial?.location ? [vial.location] : [])]));
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const pick = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function close(after: () => void) {
    setClosing(true);
    setTimeout(after, 200);
  }
  const field = "w-full px-4 py-3 rounded-2xl border outline-none text-[15px]";
  const fieldStyle = { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-1)" };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, qty: Number(form.qty), expiry: form.expiry || null, location: form.location || null };
      if (vial) {
        await api.inventory.update(vial.id, data);
      } else {
        await api.inventory.create({ ...data, nurseId: form.nurseId ? Number(form.nurseId) : null });
      }
      toast(isEdit ? "Vial updated" : "Vial added");
      close(onSaved);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add vial");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 100, animation: `${closing ? "fadeOut" : "fadeIn"} 0.2s ease forwards` }}
      onClick={() => close(onClose)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-full overflow-y-auto rounded-3xl p-6 space-y-4"
        style={{ background: "var(--bg)", animation: `${closing ? "popOut" : "popIn"} 0.2s ease forwards` }}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>{isEdit ? "Edit Vial" : "Add New Vial"}</h3>
          <button type="button" onClick={() => close(onClose)} aria-label="Close" className="p-1" style={{ color: "var(--text-3)" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <Field label="Vial Name"><input required value={form.name} onChange={set("name")} placeholder="e.g. Glutathione 500mg" className={field} style={fieldStyle} /></Field>
        <Field label="Serial Number"><input required value={form.serial} onChange={set("serial")} placeholder="VL-XXXX" className={field} style={fieldStyle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><input required type="number" min="0" step="0.5" value={form.qty} onChange={set("qty")} className={field} style={fieldStyle} /></Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={pick("unit")} options={unitOptions.map((u) => ({ label: u, value: u }))} className={field} style={fieldStyle} />
          </Field>
        </div>
        <Field label="Expiry Date"><DatePicker value={form.expiry} onChange={pick("expiry")} className={field} style={fieldStyle} /></Field>
        {!isEdit && <Field label="Assign To">
          <Select
            value={form.nurseId}
            onChange={pick("nurseId")}
            options={[{ label: "Select nurse...", value: "" }, ...nurses.map((n) => ({ label: n.name, value: String(n.id) }))]}
            className={field}
            style={fieldStyle}
          />
        </Field>}
        <Field label="Location">
          <Select value={form.location} onChange={pick("location")} options={locationOptions.map((l) => ({ label: l, value: l }))} className={field} style={fieldStyle} />
        </Field>
        <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl text-base font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Vial"}
        </button>
      </form>
    </div>
  );
}

// Admins switch between individual vials and the bulk (master) medicines held in the office.
export default function InventoryTab({ isAdmin }: { isAdmin: boolean }) {
  const [view, setView] = useState<"vials" | "medicines">("vials");
  if (!isAdmin) return <VialsTab isAdmin={false} />;

  return (
    <div>
      <div className="px-4 pt-4">
        <div className="flex p-1 rounded-2xl" style={{ background: "var(--border)" }}>
          {([["vials", "Vials"], ["medicines", "Medicines (Bulk)"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={view === key ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" } : { color: "var(--text-3)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {view === "vials" ? <VialsTab isAdmin /> : <MedicinesTab />}
    </div>
  );
}
