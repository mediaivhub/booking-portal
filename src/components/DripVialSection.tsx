"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NSS_OPTIONS } from "@/lib/constants";
import Select from "./Select";

export interface VialRow {
  itemId: string;
  qty: string;
}

export interface MedRow {
  medicineId: string;
  qty: string;
}

export interface DripLine {
  kind: "cs_drip" | "upsell";
  dripName: string;
  nss: string;
  nssQty: string;
  vials: VialRow[];
  medicines: MedRow[];
}

interface BulkMed {
  id: number;
  name: string;
  unit: string;
  expiry: string | null;
  qty: number;
  used: number;
}

interface NurseVial {
  id: number;
  name: string;
  serial: string;
  unit: string;
  qty: number;
  expiry: string | null;
  total: number;
  pool: number;
  left: number;
  usages: { bookingId: number; taskId: string; qty: number; completed: boolean }[];
}

const KIND_BADGE = {
  cs_drip: { label: "CS Drip", style: { background: "rgba(59,130,246,0.14)", color: "#3b82f6" } },
  upsell: { label: "Upsell Add-on", style: { background: "rgba(230,81,0,0.12)", color: "#e65100" } },
} as const;

const fieldStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" };
const fieldClass = "px-3 py-2.5 rounded-xl border outline-none text-sm";

// Drip & vial tracking for a booking. Vials on offer are only the ones assigned to the booking's nurse.
export default function DripVialSection({
  nurseId,
  excludeBookingId,
  drips,
  onChange,
}: {
  nurseId: number | null;
  /** When editing a booking, its own saved drips aren't counted as already used. */
  excludeBookingId?: number;
  drips: DripLine[];
  onChange: (drips: DripLine[]) => void;
}) {
  const [loaded, setLoaded] = useState<{ nurseId: number; vials: NurseVial[] } | null>(null);
  const [meds, setMeds] = useState<BulkMed[]>([]);
  const isCurrent = !!nurseId && loaded?.nurseId === nurseId;
  const vials = isCurrent ? loaded!.vials : [];
  const loading = !!nurseId && !isCurrent;

  useEffect(() => {
    if (!nurseId) return;
    let cancelled = false;
    api.inventory
      .list(nurseId, excludeBookingId)
      .then((v) => !cancelled && setLoaded({ nurseId, vials: v }))
      .catch(() => !cancelled && setLoaded({ nurseId, vials: [] }));
    return () => {
      cancelled = true;
    };
  }, [nurseId, excludeBookingId]);

  // Bulk medicines are office stock, not tied to a nurse.
  useEffect(() => {
    let cancelled = false;
    api.medicines
      .list(excludeBookingId)
      .then((m) => !cancelled && setMeds(m))
      .catch(() => !cancelled && setMeds([]));
    return () => {
      cancelled = true;
    };
  }, [excludeBookingId]);

  const add = (kind: DripLine["kind"]) => onChange([...drips, { kind, dripName: "", nss: "", nssQty: "1", vials: [{ itemId: "", qty: "1" }], medicines: [] }]);
  const patch = (i: number, p: Partial<DripLine>) => onChange(drips.map((d, idx) => (idx === i ? { ...d, ...p } : d)));
  const patchVial = (i: number, j: number, p: Partial<VialRow>) =>
    patch(i, { vials: drips[i].vials.map((v, idx) => (idx === j ? { ...v, ...p } : v)) });

  // What's left of a vial for row (i, j): what the nurse still has (assigned minus used in other bookings) minus other rows here.
  const remaining = (itemId: string, i: number, j: number) => {
    const info = vials.find((v) => String(v.id) === itemId);
    const held = info ? Math.min(info.left, info.pool) : 0;
    const usedElsewhere = drips.reduce(
      (sum, d, di) => sum + d.vials.reduce((s2, r, ri) => s2 + (r.itemId === itemId && !(di === i && ri === j) ? Number(r.qty) || 0 : 0), 0),
      0
    );
    return Math.max(0, Math.round((held - usedElsewhere) * 100) / 100);
  };
  const vialLabel = (v: NurseVial) => `${v.name} · ${v.serial} · Exp: ${v.expiry ?? "—"} · [${v.pool} of ${v.total} ${v.unit} avl]`;
  const patchMed = (i: number, j: number, p: Partial<MedRow>) =>
    patch(i, { medicines: drips[i].medicines.map((m, idx) => (idx === j ? { ...m, ...p } : m)) });
  // Bulk stock left for row (i, j): stock minus completed use, minus other rows in this form.
  const medLeft = (medicineId: string, i: number, j: number) => {
    const m = meds.find((x) => String(x.id) === medicineId);
    if (!m) return 0;
    const elsewhere = drips.reduce(
      (sum, d, di) => sum + d.medicines.reduce((s2, r, ri) => s2 + (r.medicineId === medicineId && !(di === i && ri === j) ? Number(r.qty) || 0 : 0), 0),
      0
    );
    return Math.max(0, Math.round((m.qty - m.used - elsewhere) * 100) / 100);
  };
  const medOptions = (i: number, j: number) => [
    { label: "Select medicine...", value: "" },
    ...meds
      .filter((m) => medLeft(String(m.id), i, j) > 0 || String(m.id) === drips[i].medicines[j].medicineId)
      .map((m) => ({ label: `${m.name} · Exp: ${m.expiry ?? "—"} · [${Math.max(0, m.qty - m.used)} of ${m.qty} ${m.unit} avl]`, value: String(m.id) })),
  ];
  const clamp = (qty: string, max: number) => (qty !== "" && Number(qty) > max ? String(max) : qty);

  const vialOptions = (i: number, j: number) => [
    { label: "Select vial...", value: "" },
    ...vials
      .map((v) => ({ v, left: remaining(String(v.id), i, j) }))
      // Hide vials that are used up, but keep the one already picked on this row.
      .filter(({ v, left }) => left > 0 || String(v.id) === drips[i].vials[j].itemId)
      .map(({ v }) => ({ label: vialLabel(v), value: String(v.id) })),
  ];

  let empty: string | null = null;
  if (!nurseId) empty = "Select a nurse first to see available vials";
  else if (drips.length === 0) empty = "Tap + CS Drip or + Upsell to record a drip";

  return (
    <div className="pt-3 space-y-3 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--primary-text)" }}>Drip &amp; Vial Tracking</h4>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={!nurseId}
            onClick={() => add("cs_drip")}
            className="px-3.5 py-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
            style={{ background: "rgba(82,183,136,0.16)", borderColor: "rgba(82,183,136,0.4)", color: "var(--primary-text)" }}
          >
            + CS Drip
          </button>
          <button
            type="button"
            disabled={!nurseId}
            onClick={() => add("upsell")}
            className="px-3.5 py-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
            style={{ background: "rgba(230,81,0,0.14)", borderColor: "rgba(230,81,0,0.4)", color: "#e65100" }}
          >
            + Upsell
          </button>
        </div>
      </div>

      {empty && <p className="text-center text-sm py-3" style={{ color: "var(--text-3)" }}>{empty}</p>}

      {drips.map((d, i) => {
        const badge = KIND_BADGE[d.kind];
        return (
          <div key={i} className="rounded-2xl border p-3 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold" style={{ color: "var(--primary-text)" }}>Drip {i + 1}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={badge.style}>{badge.label}</span>
              </div>
              <button type="button" onClick={() => onChange(drips.filter((_, idx) => idx !== i))} className="text-[13px] font-semibold" style={{ color: "#e05a44" }}>
                Remove
              </button>
            </div>

            <Labeled label="Drip Name">
              <input
                type="text"
                value={d.dripName}
                onChange={(e) => patch(i, { dripName: e.target.value })}
                placeholder="Enter drip name"
                maxLength={100}
                className={`w-full ${fieldClass}`}
                style={fieldStyle}
              />
            </Labeled>

            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Labeled label="NSS (Normal Saline)">
                  <Select
                    value={d.nss}
                    onChange={(v) => patch(i, { nss: v })}
                    options={[{ label: "Select NSS...", value: "" }, ...NSS_OPTIONS.map((n) => ({ label: n, value: n }))]}
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Labeled>
              </div>
              <div className="w-20 shrink-0">
                <Labeled label="Qty">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    disabled={!d.nss}
                    value={d.nssQty}
                    onChange={(e) => patch(i, { nssQty: e.target.value })}
                    className={`w-full text-center disabled:opacity-50 ${fieldClass}`}
                    style={fieldStyle}
                  />
                </Labeled>
              </div>
            </div>

            <Labeled label="Vials Used">
              <div className="space-y-2">
                {d.vials.map((v, j) => {
                  const max = v.itemId ? remaining(v.itemId, i, j) : 0;
                  return (
                    <div key={j} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Select
                          value={v.itemId}
                          onChange={(val) => {
                            const left = val ? remaining(val, i, j) : 0;
                            patchVial(i, j, { itemId: val, qty: val ? String(Math.min(1, left)) : v.qty });
                          }}
                          options={vialOptions(i, j)}
                          wide
                          className={fieldClass}
                          style={fieldStyle}
                        />
                        <input
                          type="number"
                          min="0"
                          max={v.itemId ? max : undefined}
                          step="0.5"
                          disabled={!v.itemId}
                          value={v.qty}
                          onChange={(e) => patchVial(i, j, { qty: v.itemId ? clamp(e.target.value, max) : e.target.value })}
                          className={`w-20 shrink-0 text-center disabled:opacity-50 ${fieldClass}`}
                          style={fieldStyle}
                        />
                        <button
                          type="button"
                          aria-label="Remove vial"
                          onClick={() => patch(i, { vials: d.vials.filter((_, idx) => idx !== j) })}
                          className="shrink-0 p-1"
                          style={{ color: "#e05a44" }}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {v.itemId && (() => {
                        const info = vials.find((x) => String(x.id) === v.itemId);
                        if (!info) return null;
                        return (
                          <>
                          <p className="text-[12px] font-semibold flex flex-wrap justify-between gap-x-4 px-1">
                            <span style={{ color: "#27ae60" }}>{info.pool} {info.unit} available</span>
                            <span style={{ color: "var(--text-3)" }}>{info.total} {info.unit} total</span>
                            {max < info.pool && <span className="w-full" style={{ color: "var(--text-3)" }}>{max} {info.unit} left for this row</span>}
                          </p>
                          {info.usages.map((u) => (
                            <p key={u.bookingId} className="text-[12px] font-semibold px-1" style={{ color: u.completed ? "#e65100" : "#3b82f6" }}>
                              {u.qty} {info.unit} {u.completed ? "used" : "assigned"} for {u.taskId}
                            </p>
                          ))}
                          {info.usages.length === 0 && (
                            <p className="text-[12px] font-semibold px-1" style={{ color: "var(--text-3)" }}>0 {info.unit} used for booking</p>
                          )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
                {loading && <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading vials...</p>}
                {!loading && vials.length === 0 && (
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No vials are assigned to this nurse</p>
                )}
                <button
                  type="button"
                  onClick={() => patch(i, { vials: [...d.vials, { itemId: "", qty: "1" }] })}
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--primary-text)" }}
                >
                  + Add Vial
                </button>
              </div>
            </Labeled>

            <Labeled
              label={
                <>
                  Medicines <span className="normal-case tracking-normal text-[10px] font-normal">(Bulk / Master Inventory)</span>
                </>
              }
            >
              <div className="space-y-2">
                {d.medicines.map((m, j) => {
                  const max = m.medicineId ? medLeft(m.medicineId, i, j) : 0;
                  return (
                    <div key={j} className="flex items-center gap-2">
                      <Select
                        value={m.medicineId}
                        onChange={(val) => patchMed(i, j, { medicineId: val, qty: val ? String(Math.min(1, medLeft(val, i, j))) : m.qty })}
                        options={medOptions(i, j)}
                        wide
                        className={fieldClass}
                        style={fieldStyle}
                      />
                      <input
                        type="number"
                        min="0"
                        max={m.medicineId ? max : undefined}
                        step="0.5"
                        disabled={!m.medicineId}
                        value={m.qty}
                        onChange={(e) => patchMed(i, j, { qty: m.medicineId && e.target.value !== "" && Number(e.target.value) > max ? String(max) : e.target.value })}
                        className={`w-20 shrink-0 text-center disabled:opacity-50 ${fieldClass}`}
                        style={fieldStyle}
                      />
                      <button
                        type="button"
                        aria-label="Remove medicine"
                        onClick={() => patch(i, { medicines: d.medicines.filter((_, idx) => idx !== j) })}
                        className="shrink-0 p-1"
                        style={{ color: "#e05a44" }}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
                {meds.length === 0 && <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No bulk medicines in inventory</p>}
                <button
                  type="button"
                  disabled={meds.length === 0}
                  onClick={() => patch(i, { medicines: [...d.medicines, { medicineId: "", qty: "1" }] })}
                  className="text-[13px] font-semibold disabled:opacity-40"
                  style={{ color: "var(--primary-text)" }}
                >
                  + Add Medicine
                </button>
              </div>
            </Labeled>
          </div>
        );
      })}
    </div>
  );
}

function Labeled({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
    </div>
  );
}

// Drips ready to send to the API; drops half-filled vial rows and empty drips.
export function toPayload(drips: DripLine[]) {
  return drips
    .map((d) => ({
      kind: d.kind,
      dripName: d.dripName || null,
      nss: d.nss || null,
      nssQty: d.nss ? Math.max(1, Math.round(Number(d.nssQty)) || 1) : 1,
      vials: d.vials.filter((v) => v.itemId && Number(v.qty) > 0).map((v) => ({ itemId: Number(v.itemId), qty: Number(v.qty) })),
      medicines: d.medicines.filter((m) => m.medicineId && Number(m.qty) > 0).map((m) => ({ medicineId: Number(m.medicineId), qty: Number(m.qty) })),
    }))
    .filter((d) => d.dripName || d.nss || d.vials.length || d.medicines.length);
}
