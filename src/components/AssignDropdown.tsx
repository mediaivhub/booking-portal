"use client";

interface Nurse {
  id: number;
  name: string;
  initials?: string;
}

interface Props {
  nurses: Nurse[];
  onSelect: (nurseId: number) => void;
  onClose: () => void;
}

export default function AssignDropdown({ nurses, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 animate-[slideUp_0.25s_ease]"
        style={{ background: "var(--bg-card)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-1)" }}>Assign Nurse</h3>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {nurses.map((nurse) => (
            <button
              key={nurse.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
              onClick={() => onSelect(nurse.id)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                {nurse.initials || nurse.name.split(" ").map((w) => w[0]).join("").toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{nurse.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
