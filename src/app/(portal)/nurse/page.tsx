"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import BookingCard, { BookingData } from "@/components/BookingCard";
import BookingDetail from "@/components/BookingDetail";
import StatusDropdown from "@/components/StatusDropdown";
import DatePicker from "@/components/DatePicker";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

type Page = "home" | "bookings";

export default function NursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<Page>("home");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [filter, setFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<BookingData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "admin") router.push("/admin");
  }, [status, session, router]);

  const loadBookings = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const data = await api.bookings.list(params);
    setBookings(data);
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    if (status === "authenticated") loadBookings();
  }, [status, loadBookings]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadBookings();
    }, 20000);
    return () => clearInterval(interval);
  }, [status, loadBookings]);

  async function handleStatusChange(newStatus: string) {
    if (!statusTarget) return;
    const target = statusTarget;
    setStatusTarget(null);
    try {
      await api.bookings.updateStatus(target.id, newStatus);
      toast("Status updated");
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

  const displayedBookings = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const completed = bookings.filter((b) => b.status === "completed").length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isCurrentOrUpcoming = (b: BookingData) => !b.bookingDate || new Date(b.bookingDate) >= startOfToday;
  const assigned = bookings.filter((b) => b.status === "assigned" && isCurrentOrUpcoming(b)).length;
  const ontheway = bookings.filter((b) => b.status === "ontheway" && isCurrentOrUpcoming(b)).length;
  const progress = bookings.filter((b) => b.status === "progress" && isCurrentOrUpcoming(b)).length;
  const upcomingBookings = bookings.filter(
    (b) => b.status !== "completed" && b.status !== "cancelled" && isCurrentOrUpcoming(b)
  );
  const displayedUpcoming = homeFilter === "all" ? upcomingBookings : upcomingBookings.filter((b) => b.status === homeFilter);

  const filterCounts: Record<string, number> = { all: bookings.length };
  for (const b of bookings) filterCounts[b.status] = (filterCounts[b.status] ?? 0) + 1;

  const homeCounts: Record<string, number> = { all: upcomingBookings.length };
  for (const b of upcomingBookings) homeCounts[b.status] = (homeCounts[b.status] ?? 0) + 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4" style={{ background: "var(--primary)", height: "56px" }}>
        <span className="font-bold text-[17px] text-white" style={{ letterSpacing: "-0.02em" }}>IV Hub</span>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{session?.user?.name}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--primary)" }}
          >
            {session?.user?.initials || session?.user?.name?.split(" ").map((w) => w[0]).join("") || "N"}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg flex"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        {page === "home" && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                Hi, {session?.user?.name?.split(" ")[0]}
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {bookings.length} bookings
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "New", value: assigned, color: "var(--status-assigned)" },
                { label: "On Way", value: ontheway, color: "var(--status-ontheway)" },
                { label: "Active", value: progress, color: "var(--status-progress)" },
                { label: "Done", value: completed, color: "var(--status-completed)" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl text-center border" style={{ padding: "10px 8px", borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="text-[22px] font-extrabold tabular-nums leading-tight" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Current / upcoming bookings preview */}
            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-2)" }}>Your Upcoming Bookings</h3>

              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {["all", "assigned", "ontheway", "progress", "completed"].map((f) => (
                  <button
                    key={f}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: homeFilter === f ? "var(--primary)" : "var(--bg-card)",
                      color: homeFilter === f ? "#fff" : "var(--text-2)",
                      border: `1px solid ${homeFilter === f ? "var(--primary)" : "var(--border)"}`,
                    }}
                    onClick={() => setHomeFilter(f)}
                  >
                    {f === "all" ? "All" : f === "ontheway" ? "On Way" : f === "progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="ml-1 opacity-70">{homeCounts[f] ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {displayedUpcoming.slice(0, 5).map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isAdmin={false}
                    onDetail={(bk) => setDetailId(bk.id)}
                    onStatus={(bk) => setStatusTarget(bk)}
                  />
                ))}
                {displayedUpcoming.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>No upcoming bookings</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {page === "bookings" && (
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>My Bookings</h2>

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
                  <span className="ml-1 opacity-70">{filterCounts[f] ?? 0}</span>
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 flex items-center gap-1.5">
                <label className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>From</label>
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  className="flex-1 px-3 py-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <label className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>To</label>
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  className="flex-1 px-3 py-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
                />
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {displayedBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isAdmin={false}
                  onDetail={(bk) => setDetailId(bk.id)}
                  onStatus={(bk) => setStatusTarget(bk)}
                />
              ))}
              {displayedBookings.length === 0 && (
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
        className="fixed bottom-0 left-0 right-0 border-t"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          zIndex: 90,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around" style={{ height: "56px" }}>
          {[
            {
              key: "home" as Page,
              label: "Home",
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
            },
            {
              key: "bookings" as Page,
              label: "Bookings",
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="flex flex-col items-center transition-colors rounded-lg hover:bg-[var(--bg)]"
              style={{ gap: "2px", padding: "6px 16px", color: page === item.key ? "var(--primary)" : "var(--text-3)" }}
            >
              <span className="w-6 h-6">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
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
