"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
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

export default function BookingDetail({ bookingId, isAdmin, onClose, onUpdate, nurses }: Props) {
  const [booking, setBooking] = useState<DetailData | null>(null);
  const [tab, setTab] = useState<"details" | "client" | "history">("details");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  useEffect(() => {
    api.bookings.get(bookingId).then(setBooking);
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }

  const canEdit = isAdmin && booking.status !== "completed" && booking.status !== "cancelled";

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

  const statusActions = [
    { key: "ontheway", label: "On Way" },
    { key: "progress", label: "Active" },
    { key: "completed", label: "Done" },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col animate-[slideUp_0.3s_ease]" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold" style={{ color: "var(--primary)" }}>{booking.taskId}</span>
          <StatusBadge status={booking.status} />
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--bg)" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        {(["details", "client", "history"] as const).map((t) => (
          <button
            key={t}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
            style={{
              borderColor: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "var(--primary)" : "var(--text-3)",
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: "100px" }}>
        {tab === "details" && !editing && (
          <>
            {canEdit && (
              <button
                className="w-full py-2 rounded-xl text-xs font-semibold border"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                onClick={startEdit}
              >
                Edit Booking
              </button>
            )}
            <DetailRow label="Service" value={booking.service} />
            <DetailRow label="Order ID" value={booking.orderId} />
            <DetailRow label="Time Slot" value={booking.timeSlot} />
            <DetailRow label="Date" value={booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : undefined} />
            <DetailRow label="Address" value={booking.address} />
            <DetailRow label="Description" value={booking.description} />
            <DetailRow label="Payment" value={booking.paymentMethod} />
            {booking.trackingLink && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Tracking</p>
                <a href={booking.trackingLink} target="_blank" rel="noopener" className="text-sm underline" style={{ color: "var(--primary)" }}>
                  Open tracking link
                </a>
              </div>
            )}

            {/* Status quick actions */}
            {booking.status !== "completed" && booking.status !== "cancelled" && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Quick Status</p>
                <div className="flex gap-2">
                  {statusActions.map((s) => (
                    <button
                      key={s.key}
                      disabled={booking.status === s.key}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-30"
                      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      onClick={() => handleStatusChange(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Assign section for admin */}
            {isAdmin && !booking.nurse && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Assign Nurse</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {nurses.map((n) => (
                    <button
                      key={n.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => handleAssign(n.id)}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--primary)" }}>
                        {n.initials || n.name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <span className="text-sm">{n.name}</span>
                    </button>
                  ))}
                </div>
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
            <DetailRow label="Phone" value={booking.client.phone} />
            <DetailRow label="Email" value={booking.client.email} />
            {booking.nurse && (
              <>
                <div className="border-t my-4" style={{ borderColor: "var(--border)" }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Assigned Nurse</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
                    {booking.nurse.initials || booking.nurse.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{booking.nurse.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Team: Nurses</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {booking.history && booking.history.length > 0 ? (
              booking.history.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--primary)" }} />
                  <div>
                    <p className="text-sm font-medium">{h.action}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      {h.performedBy && `${h.performedBy} · `}
                      {new Date(h.createdAt).toLocaleString()}
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
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="text-sm" style={{ color: "var(--text-1)" }}>{value}</p>
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
