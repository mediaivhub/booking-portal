"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import StatusDropdown from "./StatusDropdown";
import DatePicker from "./DatePicker";
import { api } from "@/lib/api";
import { toast } from "./Toast";
import type { BookingData } from "./BookingCard";

interface DetailData extends BookingData {
  history?: { id: number; action: string; performedBy?: string; createdAt: string }[];
}

interface Props {
  bookingId: number;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: () => void;
  nurses: { id: number; name: string; initials?: string }[];
}

function historyColor(action: string): string {
  if (action.includes("Completed")) return "var(--status-completed)";
  if (action.includes("On the Way")) return "var(--status-ontheway)";
  if (action.includes("In Progress")) return "var(--status-progress)";
  if (action.includes("Assigned") || action.includes("created")) return "var(--status-progress)";
  return "var(--status-assigned)";
}

export default function BookingDetail({ bookingId, isAdmin, onClose, onUpdate, nurses }: Props) {
  const [booking, setBooking] = useState<DetailData | null>(null);
  const [tab, setTab] = useState<"details" | "client" | "history">("details");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    api.bookings.get(bookingId).then(setBooking);
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }

  const canEdit = isAdmin && booking.status !== "cancelled";
  const createdBy = booking.history?.find((h) => h.action === "Booking created")?.performedBy;

  function startEdit() {
    setEditData({
      service: booking!.service || "",
      address: booking!.address || "",
      description: booking!.description || "",
      timeSlot: booking!.timeSlot || "",
      bookingDate: booking!.bookingDate ? booking!.bookingDate.split("T")[0] : "",
      paymentMethod: booking!.paymentMethod || "",
      orderId: booking!.orderId || "",
      clientName: booking!.client.name || "",
      clientPhone: booking!.client.phone || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    try {
      await api.bookings.edit(booking!.id, editData);
      toast("Booking updated");
      setEditing(false);
      const updated = await api.bookings.get(bookingId);
      setBooking(updated);
      onUpdate();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function handleStatusChange(status: string) {
    setShowStatus(false);
    try {
      await api.bookings.updateStatus(booking!.id, status);
      toast("Status updated");
      const updated = await api.bookings.get(bookingId);
      setBooking(updated);
      onUpdate();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function handleAssign(nurseId: number) {
    setShowAssign(false);
    try {
      await api.bookings.assign(booking!.id, nurseId);
      toast("Nurse assigned");
      const updated = await api.bookings.get(bookingId);
      setBooking(updated);
      onUpdate();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col animate-[slideUp_0.3s_ease]" style={{ background: "var(--bg-card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4" style={{ background: "var(--primary)", padding: "16px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-[17px] text-white tabular-nums">{booking.jobId || booking.taskId}</span>
          <StatusBadge status={booking.status} />
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4" style={{ background: "var(--primary)" }}>
        {(["details", "client", "history"] as const).map((t) => (
          <button
            key={t}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
            style={{
              borderColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "#fff" : "rgba(255,255,255,0.5)",
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "100px", WebkitOverflowScrolling: "touch" }}>
        {tab === "details" && !editing && (
          <>
            {canEdit && (
              <button
                className="w-full py-2 mb-3 rounded-xl text-xs font-semibold border"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                onClick={startEdit}
              >
                Edit Booking
              </button>
            )}
            <DetailRow label="Address" value={booking.address} isAddress />
            <DetailRow label="Description" value={booking.description} />
            <DetailRow label="Order ID" value={booking.orderId} />
            <DetailRow label="Job ID" value={booking.jobId} />
            <DetailRow label="Service" value={booking.service} />
            <DetailRow label="Payment" value={booking.paymentMethod} />
            <DetailRow label="Created" value={booking.createdAt ? new Date(booking.createdAt).toLocaleString() : undefined} />
            <DetailRow label="Created By" value={createdBy} />
            <DetailRow label="Last Updated" value={booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : undefined} />

            {booking.trackingLink && (
              <div className="py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Tracking</p>
                <a href={booking.trackingLink} target="_blank" rel="noopener" className="text-sm underline" style={{ color: "var(--primary)" }}>
                  Open tracking link
                </a>
              </div>
            )}

          </>
        )}

        {tab === "details" && editing && (
          <div className="space-y-3">
            <EditField label="Service" value={editData.service} onChange={(v) => setEditData({ ...editData, service: v })} />
            <EditField label="Order ID" value={editData.orderId} onChange={(v) => setEditData({ ...editData, orderId: v })} />
            <EditField label="Time Slot" value={editData.timeSlot} onChange={(v) => setEditData({ ...editData, timeSlot: v })} />
            <EditField label="Date" value={editData.bookingDate} onChange={(v) => setEditData({ ...editData, bookingDate: v })} type="date" />
            <EditField label="Address" value={editData.address} onChange={(v) => setEditData({ ...editData, address: v })} />
            <EditField label="Description" value={editData.description} onChange={(v) => setEditData({ ...editData, description: v })} multiline />
            <EditField label="Payment Method" value={editData.paymentMethod} onChange={(v) => setEditData({ ...editData, paymentMethod: v })} />
            <EditField label="Client Name" value={editData.clientName} onChange={(v) => setEditData({ ...editData, clientName: v })} />
            <EditField label="Client Phone" value={editData.clientPhone} onChange={(v) => setEditData({ ...editData, clientPhone: v })} />
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--primary)" }}
                onClick={saveEdit}
              >
                Save Changes
              </button>
              <button
                className="px-4 py-3 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {tab === "client" && (
          <>
            <DetailRow label="Name" value={booking.client.name} />
            <DetailRow label="Phone" value={booking.client.phone} isPhone />
            <DetailRow label="Email" value={booking.client.email} />
          </>
        )}

        {tab === "history" && (
          <div className="pt-1">
            {booking.history && booking.history.length > 0 ? (
              booking.history.map((h, i) => (
                <div key={h.id} className="flex gap-3 relative" style={{ paddingBottom: i < booking.history!.length - 1 ? "20px" : 0 }}>
                  {i < booking.history!.length - 1 && (
                    <div className="absolute" style={{ left: "9px", top: "22px", bottom: 0, width: "2px", background: "var(--border)" }} />
                  )}
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 relative z-[1]"
                    style={{ background: `color-mix(in srgb, ${historyColor(h.action)} 15%, transparent)` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: historyColor(h.action) }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
                      {h.action}{h.performedBy && ` by ${h.performedBy}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-3)" }}>No history yet</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {booking.nurse ? (
        <div className="flex items-center gap-2.5 px-4 flex-wrap" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--primary)" }}>
              {booking.nurse.initials || booking.nurse.name.split(" ").map((w) => w[0]).join("")}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{booking.nurse.name}</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>Team: Nurses</p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "var(--primary)" }}
              onClick={() => setShowStatus(true)}
            >
              Update Status ▾
            </button>
            {booking.nurse.phone ? (
              <a
                href={`tel:${booking.nurse.phone}`}
                title="Call nurse"
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--status-completed)", color: "#fff" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        isAdmin && (
          <div className="relative" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--primary)" }}
              onClick={() => setShowAssign((v) => !v)}
            >
              Assign Nurse
            </button>
            {showAssign && (
              <div className="absolute bottom-16 left-4 right-4 rounded-xl border shadow-lg p-1.5 max-h-56 overflow-y-auto z-10" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                {nurses.map((n) => (
                  <button
                    key={n.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left"
                    onClick={() => handleAssign(n.id)}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--primary)" }}>
                      {n.initials || n.name.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <span className="text-sm">{n.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {showStatus && (
        <StatusDropdown
          currentStatus={booking.status}
          onSelect={handleStatusChange}
          onClose={() => setShowStatus(false)}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, isAddress, isPhone }: { label: string; value?: string | null; isAddress?: boolean; isPhone?: boolean }) {
  return (
    <div className="py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
      {!value ? (
        <p className="text-sm" style={{ color: "var(--text-1)" }}>—</p>
      ) : isAddress ? (
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(value)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--primary-mid)" }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          {value}
        </a>
      ) : isPhone ? (
        <a href={`tel:${value}`} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--status-completed)" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium" style={{ color: "var(--text-1)", whiteSpace: "pre-wrap" }}>{value}</p>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      ) : type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      )}
    </div>
  );
}
