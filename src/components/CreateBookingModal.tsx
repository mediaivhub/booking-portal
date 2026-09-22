"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "./Toast";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import Select from "./Select";
import DripVialSection, { DripLine, toPayload } from "./DripVialSection";
import { SERVICES, PAYMENT_METHODS, INVENTORY_LOCATIONS } from "@/lib/constants";
import { formatTime12 } from "@/lib/time";

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
    orderId: "",
    address: "",
    description: "",
    bookingDate: "",
    startTime: "09:00",
    endTime: "09:30",
    service: SERVICES[0],
    nurseId: "",
    paymentMethod: PAYMENT_METHODS[0],
    paymentHeldFor: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [dripLines, setDripLines] = useState<DripLine[]>([]);
  const [closing, setClosing] = useState(false);

  function requestClose() {
    setClosing(true);
    setTimeout(onClose, 250);
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Vials belong to the selected nurse, so changing nurse resets them.
    if (key === "nurseId") setDripLines([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName) {
      toast("Client name required");
      return;
    }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { startTime, endTime, ...rest } = form;
      await api.bookings.create({
        ...rest,
        timeSlot: formatTime12(startTime),
        // End Time is commented out for now (see JSX below) — using start time only.
        // timeSlot: `${formatTime12(startTime)} - ${formatTime12(endTime)}`,
        nurseId: form.nurseId ? parseInt(form.nurseId) : null,
        drips: toPayload(dripLines),
      });
      toast("Booking created");
      onCreated();
      onClose();
    } catch (err) {
      toast((err as Error).message);
    }
    setLoading(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" onClick={requestClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] overflow-y-auto ${closing ? "animate-[slideDownOut_0.25s_ease_forwards]" : "animate-[slideUp_0.3s_ease]"}`}
        style={{ background: "var(--bg-card)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)", WebkitOverflowScrolling: "touch" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 p-4 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "var(--border)" }} />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>New Booking</h3>
            <button
              onClick={requestClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:brightness-90"
              style={{ background: "var(--bg)", color: "var(--text-3)" }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Client Name *" value={form.clientName} onChange={(v) => update("clientName", v)} placeholder="e.g. Fatma" />
            <FormField label="Phone" value={form.clientPhone} onChange={(v) => update("clientPhone", v)} placeholder="+971..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Email" value={form.clientEmail} onChange={(v) => update("clientEmail", v)} type="email" placeholder="client@email.com" />
            <FormField label="Order ID" value={form.orderId} onChange={(v) => update("orderId", v)} placeholder="e.g. IV" />
          </div>

          <FormField label="Address" value={form.address} onChange={(v) => update("address", v)} placeholder="Full address in Dubai" />

          <FormField label="Description" value={form.description} onChange={(v) => update("description", v)} placeholder="Notes for this booking" multiline />

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Date" value={form.bookingDate} onChange={(v) => update("bookingDate", v)} type="date" />

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-2)" }}>
                Start Time
              </label>
              <TimePicker
                value={form.startTime}
                onChange={(v) => update("startTime", v)}
                className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* End Time commented out for now — using start time only.
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-2)" }}>
              End Time
            </label>
            <TimePicker
              value={form.endTime}
              onChange={(v) => update("endTime", v)}
              className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </div>
          */}

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Service" value={form.service} onChange={(v) => update("service", v)} options={SERVICES} />
            <FormField
              label="Assign Nurse"
              value={form.nurseId}
              onChange={(v) => update("nurseId", v)}
              options={["— Unassigned —", ...nurses.map((n) => n.name)]}
              optionValues={["", ...nurses.map((n) => String(n.id))]}
            />
          </div>

          <FormField label="Payment" value={form.paymentMethod} onChange={(v) => update("paymentMethod", v)} options={PAYMENT_METHODS} />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Payment to Collect (optional)" value={form.paymentHeldFor} onChange={(v) => update("paymentHeldFor", v)} placeholder="e.g. Ahmed / Order #1234" />
            {/* INVENTORY_LOCATIONS is the single source of truth for locations across the app (src/lib/constants.ts). */}
            <FormField
              label="Location"
              value={form.location}
              onChange={(v) => update("location", v)}
              options={["— Not set —", ...INVENTORY_LOCATIONS]}
              optionValues={["", ...INVENTORY_LOCATIONS]}
            />
          </div>

          <DripVialSection nurseId={form.nurseId ? parseInt(form.nurseId) : null} location={form.location} drips={dripLines} onChange={setDripLines} />

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
    </div>,
    document.body
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  placeholder,
  options,
  optionValues,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  options?: string[];
  optionValues?: string[];
}) {
  const fieldStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" };

  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-2)" }}>
        {label}
      </label>
      {options ? (
        <Select
          value={value}
          onChange={onChange}
          options={options.map((opt, i) => ({ label: opt, value: optionValues ? optionValues[i] : opt }))}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={fieldStyle}
        />
      ) : type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={fieldStyle}
        />
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={fieldStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
          style={fieldStyle}
        />
      )}
    </div>
  );
}
