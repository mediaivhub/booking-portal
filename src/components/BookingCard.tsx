"use client";

import StatusBadge from "./StatusBadge";

export interface BookingData {
  id: number;
  taskId: string;
  jobId?: string;
  orderId?: string;
  status: string;
  service?: string;
  address?: string;
  description?: string;
  timeSlot?: string;
  bookingDate?: string;
  paymentMethod?: string;
  trackingLink?: string;
  createdAt?: string;
  updatedAt?: string;
  client: { id: number; name: string; phone?: string; email?: string };
  nurse?: { id: number; name: string; initials?: string; phone?: string | null } | null;
}

interface Props {
  booking: BookingData;
  isAdmin: boolean;
  onDetail: (booking: BookingData) => void;
  onAssign?: (booking: BookingData) => void;
  onStatus?: (booking: BookingData) => void;
  /** Read-only card for archival views (e.g. History) — no Assign/Status actions, shows service name instead. */
  readOnly?: boolean;
}

export default function BookingCard({
  booking,
  isAdmin,
  onDetail,
  onAssign,
  onStatus,
  readOnly,
}: Props) {
  const initials = booking.nurse?.initials ||
    booking.nurse?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase() ||
    "";

  const canChangeStatus =
    booking.status !== "completed" && booking.status !== "cancelled";

  return (
    <div
      className="rounded-2xl border p-4 cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
      onClick={() => onDetail(booking)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--primary)" }}>
          {booking.taskId}
        </span>
        <StatusBadge status={booking.status} />
      </div>

      <div className="space-y-2 text-sm" style={{ color: "var(--text-2)" }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>
            <strong>{booking.timeSlot || "No time"}</strong>
            {booking.bookingDate && ` · ${new Date(booking.bookingDate).toLocaleDateString()}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>
            <strong>{booking.client.name}</strong>
            {booking.client.phone && ` · ${booking.client.phone}`}
          </span>
        </div>

        {booking.address && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-xs line-clamp-2">{booking.address}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        {booking.nurse ? (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              {initials}
            </div>
            <span className="text-xs font-medium">{booking.nurse.name}</span>
          </div>
        ) : isAdmin && !readOnly ? (
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: "var(--accent)" }}
            onClick={(e) => {
              e.stopPropagation();
              onAssign?.(booking);
            }}
          >
            Assign
          </button>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Unassigned</span>
        )}

        {readOnly ? (
          booking.service && (
            <span className="text-xs" style={{ color: "var(--text-3)" }}>{booking.service}</span>
          )
        ) : (
          canChangeStatus && (
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              onClick={(e) => {
                e.stopPropagation();
                onStatus?.(booking);
              }}
            >
              Status ▾
            </button>
          )
        )}
      </div>
    </div>
  );
}
