"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddNurseModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast("Name and email required");
      return;
    }
    setLoading(true);
    try {
      await api.nurses.create(form);
      toast("Nurse added");
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
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl animate-[slideUp_0.3s_ease]"
        style={{ background: "var(--bg-card)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "var(--border)" }} />
          <h3 className="text-lg font-bold" style={{ color: "var(--primary)" }}>Add Nurse</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <Field label="Name *" value={form.name} onChange={(v) => update("name", v)} />
          <Field label="Email *" value={form.email} onChange={(v) => update("email", v)} type="email" />
          <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
          <Field label="Password" value={form.password} onChange={(v) => update("password", v)} type="password" placeholder="Default: nurse123" />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Adding..." : "Add Nurse"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />
    </div>
  );
}
