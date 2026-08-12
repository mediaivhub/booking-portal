const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unassigned: { label: "Unassigned", color: "var(--status-unassigned)" },
  assigned: { label: "Assigned", color: "var(--status-assigned)" },
  ontheway: { label: "On the Way", color: "var(--status-ontheway)" },
  progress: { label: "In Progress", color: "var(--status-progress)" },
  completed: { label: "Completed", color: "var(--status-completed)" },
  cancelled: { label: "Cancelled", color: "var(--status-cancelled)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unassigned;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        color: config.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
