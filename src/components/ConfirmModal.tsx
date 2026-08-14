"use client";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmModal({ title, message, confirmLabel = "Delete", onConfirm, onClose, loading }: Props) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 animate-[popIn_0.2s_ease]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-1)" }}>{title}</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>{message}</p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--status-cancelled)" }}
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
