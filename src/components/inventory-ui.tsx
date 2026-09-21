// Small pieces shared by the vial and bulk-medicine views of the Inventory tab.

export const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" };

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: "var(--text-3)" }}>{label}</span>
      {children}
    </label>
  );
}

export function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border p-2 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</p>
    </div>
  );
}

export function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}
