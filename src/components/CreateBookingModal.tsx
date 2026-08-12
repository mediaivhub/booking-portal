"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "./Toast";

interface Nurse {
  id: number;
  name: string;
}

interface Props {
  nurses: Nurse[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateBookingModal({ nurses, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    service: "",
    address: "",
    description: "",
    timeSlot: "",
    bookingDate: "",
    paymentMethod: "",
    orderId: "",
    nurseId: "",
  });
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName) {
      toast("Client name required");
      return;
    }
    setLoading(true);
    try {
      await api.bookings.create({
        ...form,
        nurseId: form.nurseId ? parseInt(form.nurseId) : null,
      });
      toast("Booking created");
      onCreated();
      onClose();
    } catch (err) {
      toast((err as Error).message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-[slideUp_0.3s_ease]"
        style={{ background: "var(--bg-card)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 p-4 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "var(--border)" }} />
          <h3 className="text-lg font-bold" style={{ color: "var(--primary)" }}>New Booking</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <FormField label="Client Name *" value={form.clientName} onChange={(v) => update("clientName", v)} />
          <FormField label="Client Phone" value={form.clientPhone} onChange={(v) => update("clientPhone", v)} />
          <FormField label="Client Email" value={form.clientEmail} onChange={(v) => update("clientEmail", v)} type="email" />
          <FormField label="Service" value={form.service} onChange={(v) => update("service", v)} />
          <FormField label="Order ID" value={form.orderId} onChange={(v) => update("orderId", v)} />
          <FormField label="Address" value={form.address} onChange={(v) => update("address", v)} />
          <FormField label="Description" value={form.description} onChange={(v) => update("description", v)} multiline />
          <FormField label="Time Slot" value={form.timeSlot} onChange={(v) => update("timeSlot", v)} placeholder="e.g. 06:00 PM - 07:00 PM" />
          <FormField label="Date" value={form.bookingDate} onChange={(v) => update("bookingDate", v)} type="date" />
          <FormField label="Payment Method" value={form.paymentMethod} onChange={(v) => update("paymentMethod", v)} />

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
              Assign Nurse
            </label>
            <select
              value={form.nurseId}
              onChange={(e) => update("nurseId", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
            >
              <option value="">Unassigned</option>
              {nurses.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold mt-2 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Creating..." : "Create Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
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
          rows={2}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      )}
    </div>
  );
}
