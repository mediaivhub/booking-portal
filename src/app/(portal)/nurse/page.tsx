"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import BookingCard, { BookingData } from "@/components/BookingCard";
import BookingDetail from "@/components/BookingDetail";
import StatusDropdown from "@/components/StatusDropdown";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

type Page = "home" | "bookings";

export default function NursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<Page>("home");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<BookingData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "admin") router.push("/admin");
  }, [status, session, router]);

  const loadBookings = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filter !== "all") params.status = filter;
    if (search) params.search = search;
    const data = await api.bookings.list(params);
    setBookings(data);
  }, [filter, search]);

  useEffect(() => {
    if (status === "authenticated") loadBookings();
  }, [status, loadBookings]);

  async function handleStatusChange(newStatus: string) {
    if (!statusTarget) return;
    try {
      await api.bookings.updateStatus(statusTarget.id, newStatus);
      toast("Status updated");
      setStatusTarget(null);
      loadBookings();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
      </div>
    );
  }

  const assigned = bookings.filter((b) => b.status === "assigned").length;
  const ontheway = bookings.filter((b) => b.status === "ontheway").length;
  const progress = bookings.filter((b) => b.status === "progress").length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--primary)" }}>
            {session?.user?.initials || session?.user?.name?.split(" ").map(w => w[0]).join("") || "N"}
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>{session?.user?.name}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
        >
          Logout
        </button>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        {page === "home" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>My Bookings</h2>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "New", value: assigned, color: "var(--status-assigned)" },
                { label: "On Way", value: ontheway, color: "var(--status-ontheway)" },
                { label: "Active", value: progress, color: "var(--status-progress)" },
                { label: "Done", value: completed, color: "var(--status-completed)" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--text-3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                placeholder="Search your bookings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 outline-none text-sm bg-transparent"
                style={{ color: "var(--text-1)" }}
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["all", "assigned", "ontheway", "progress", "completed"].map((f) => (
                <button
                  key={f}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: filter === f ? "var(--primary)" : "var(--bg-card)",
                    color: filter === f ? "#fff" : "var(--text-2)",
                    border: `1px solid ${filter === f ? "var(--primary)" : "var(--border)"}`,
                  }}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "ontheway" ? "On Way" : f === "progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isAdmin={false}
                  onDetail={(bk) => setDetailId(bk.id)}
                  onStatus={(bk) => setStatusTarget(bk)}
                />
              ))}
              {bookings.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No bookings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          {
            key: "home" as Page,
            label: "Bookings",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5"
            style={{ color: page === item.key ? "var(--primary)" : "var(--text-3)" }}
          >
            <span className="w-6 h-6">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {detailId && (
        <BookingDetail
          bookingId={detailId}
          isAdmin={false}
          onClose={() => setDetailId(null)}
          onUpdate={loadBookings}
          nurses={[]}
        />
      )}

      {statusTarget && (
        <StatusDropdown
          currentStatus={statusTarget.status}
          onSelect={handleStatusChange}
          onClose={() => setStatusTarget(null)}
        />
      )}
    </div>
  );
}
