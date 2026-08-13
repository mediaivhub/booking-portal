"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import BookingCard, { BookingData } from "@/components/BookingCard";
import { BookingListSkeleton } from "@/components/BookingCardSkeleton";
import BookingDetail from "@/components/BookingDetail";
import StatusDropdown from "@/components/StatusDropdown";
import AssignDropdown from "@/components/AssignDropdown";
import CreateBookingModal from "@/components/CreateBookingModal";
import AddNurseModal from "@/components/AddNurseModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import DatePicker from "@/components/DatePicker";
import Select from "@/components/Select";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

type Page = "home" | "history" | "team";

interface NurseInfo {
  id: number;
  name: string;
  initials?: string;
  email?: string;
  phone?: string;
  team?: string;
  isActive?: boolean;
  _count?: { active: number; done: number; total: number };
}

interface DashboardData {
  counts: Record<string, number>;
  nurses: NurseInfo[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<Page>("home");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [nurses, setNurses] = useState<NurseInfo[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<BookingData | null>(null);
  const [assignTarget, setAssignTarget] = useState<BookingData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddNurse, setShowAddNurse] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<NurseInfo | null>(null);
  const [nurseActionsOpen, setNurseActionsOpen] = useState<number | null>(null);
  const [teamFilter, setTeamFilter] = useState<"active" | "inactive">("active");
  const [nurseFilter, setNurseFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsCounts, setBookingsCounts] = useState<Record<string, number>>({
    all: 0, unassigned: 0, assigned: 0, ontheway: 0, progress: 0, completed: 0, cancelled: 0,
  });
  const [bookingsServices, setBookingsServices] = useState<string[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [homeFilter, setHomeFilter] = useState("all");
  const [homeCounts, setHomeCounts] = useState<Record<string, number>>({
    all: 0, unassigned: 0, assigned: 0, ontheway: 0, progress: 0, completed: 0, cancelled: 0,
  });
  const [upcoming, setUpcoming] = useState<BookingData[]>([]);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [upcomingLoaded, setUpcomingLoaded] = useState(false);
  const PAGE_SIZE = 20;
  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "nurse") router.push("/nurse");
  }, [status, session, router]);

  const loadUpcoming = useCallback(async () => {
    const params: Record<string, string> = {
      dateFrom: todayISO,
      // Home only ever shows non-completed work — completed bookings belong
      // in History — so "all" here means all-but-completed, not every status.
      status: homeFilter === "all" ? "unassigned,assigned,ontheway,progress,cancelled" : homeFilter,
      page: String(upcomingPage),
      limit: String(PAGE_SIZE),
    };
    const res = await api.bookings.list(params);
    setUpcoming(res.data);
    setUpcomingTotal(res.total);
    setHomeCounts({
      ...res.counts,
      all: (res.counts.unassigned || 0) + (res.counts.assigned || 0) + (res.counts.ontheway || 0) + (res.counts.progress || 0) + (res.counts.cancelled || 0),
    });
    setUpcomingLoaded(true);
  }, [upcomingPage, homeFilter, todayISO]);

  useEffect(() => {
    setUpcomingPage(1);
  }, [homeFilter]);

  const loadBookings = useCallback(async () => {
    const params: Record<string, string> = {
      page: String(bookingsPage),
      limit: String(PAGE_SIZE),
    };
    if (filter !== "all") params.status = filter;
    if (search) params.search = search;
    if (nurseFilter) params.nurseId = nurseFilter;
    if (serviceFilter) params.service = serviceFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const res = await api.bookings.list(params);
    setBookings(res.data);
    setBookingsTotal(res.total);
    setBookingsCounts(res.counts);
    setBookingsServices(res.services);
    setBookingsLoaded(true);
  }, [bookingsPage, filter, search, nurseFilter, serviceFilter, dateFrom, dateTo]);

  useEffect(() => {
    setBookingsPage(1);
  }, [filter, search, nurseFilter, serviceFilter, dateFrom, dateTo]);

  const loadNurses = useCallback(async () => {
    const data = await api.nurses.list();
    setNurses(data);
  }, []);

  const loadDashboard = useCallback(async () => {
    const data = await api.dashboard();
    setDashboard(data);
  }, []);

  function refreshCurrentView() {
    if (page === "home") loadUpcoming();
    else if (page === "history") loadBookings();
    loadDashboard();
    loadNurses();
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadNurses();
      loadDashboard();
    }
  }, [status, loadNurses, loadDashboard]);

  useEffect(() => {
    if (status === "authenticated" && page === "home") loadUpcoming();
  }, [status, page, loadUpcoming]);

  useEffect(() => {
    if (status === "authenticated" && page === "history") loadBookings();
  }, [status, page, loadBookings]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadDashboard();
      if (page === "home") loadUpcoming();
      else if (page === "history") loadBookings();
    }, 10000);
    return () => clearInterval(interval);
  }, [status, page, loadUpcoming, loadBookings, loadDashboard]);

  async function handleStatusChange(newStatus: string) {
    if (!statusTarget) return;
    const target = statusTarget;
    setStatusTarget(null);
    try {
      await api.bookings.updateStatus(target.id, newStatus);
      toast("Status updated");
      refreshCurrentView();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function handleAssign(nurseId: number) {
    if (!assignTarget) return;
    const target = assignTarget;
    setAssignTarget(null);
    try {
      await api.bookings.assign(target.id, nurseId);
      toast("Nurse assigned");
      refreshCurrentView();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function toggleNurseActive(nurse: NurseInfo) {
    try {
      await api.nurses.setActive(nurse.id, !nurse.isActive);
      toast(nurse.isActive ? `${nurse.name} set to not active` : `${nurse.name} set to active`);
      loadNurses();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function resetNursePassword(password: string) {
    if (!resetPasswordTarget) return;
    const target = resetPasswordTarget;
    setResetPasswordTarget(null);
    try {
      await api.nurses.resetPassword(target.id, password);
      toast(`Password reset for ${target.name}`);
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

  const hasActiveFilters = nurseFilter || serviceFilter || dateFrom || dateTo;

  function clearFilters() {
    setNurseFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const totalPages = Math.max(1, Math.ceil(bookingsTotal / PAGE_SIZE));

  const filterUI = (
    <>
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <svg className="w-4 h-4" style={{ color: "var(--text-3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input
          placeholder="Search bookings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent"
          style={{ color: "var(--text-1)" }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["all", "unassigned", "assigned", "ontheway", "completed", "cancelled"].map((f) => (
          <button
            key={f}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: filter === f ? "var(--primary)" : "var(--bg-card)",
              color: filter === f ? "#fff" : "var(--text-2)",
              border: `1px solid ${filter === f ? "var(--primary)" : "var(--border)"}`,
            }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "ontheway" ? "On Way" : f === "progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1 opacity-70">{bookingsCounts[f] ?? ""}</span>
          </button>
        ))}
      </div>

      {/* Filter Dropdowns — Nurse & Service */}
      <div className="flex gap-2">
        <Select
          value={nurseFilter}
          onChange={setNurseFilter}
          options={[{ label: "All Nurses", value: "" }, ...nurses.map((n) => ({ label: n.name, value: String(n.id) }))]}
          className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
        />
        <Select
          value={serviceFilter}
          onChange={setServiceFilter}
          options={[{ label: "All Services", value: "" }, ...bookingsServices.map((s) => ({ label: s, value: s }))]}
          className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
        />
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
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0"
            style={{ borderColor: "var(--border)", color: "var(--status-cancelled)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Booking Cards */}
      {!bookingsLoaded ? (
        <BookingListSkeleton />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              isAdmin
              onDetail={(bk) => setDetailId(bk.id)}
              onAssign={(bk) => setAssignTarget(bk)}
              onStatus={(bk) => setStatusTarget(bk)}
            />
          ))}
          {bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "var(--text-3)" }}>No bookings match</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {bookingsTotal > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            disabled={bookingsPage <= 1}
            onClick={() => setBookingsPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-30"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            ← Prev
          </button>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            Page {bookingsPage} of {totalPages} · {bookingsTotal} total
          </span>
          <button
            disabled={bookingsPage >= totalPages}
            onClick={() => setBookingsPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-30"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );

  const todayLabel = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const completedPct = dashboard?.counts.total ? Math.round(((dashboard.counts.completed || 0) / dashboard.counts.total) * 100) : 0;
  const inProgressTotal = (dashboard?.counts.assigned || 0) + (dashboard?.counts.ontheway || 0) + (dashboard?.counts.progress || 0);

  const navItems = [
    {
      label: "Home",
      href: "#home",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
      label: "History",
      href: "#history",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    },
    {
      label: "Team",
      href: "#team",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4" style={{ background: "var(--primary)", height: "calc(56px + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <span className="font-bold text-[17px] text-white" style={{ letterSpacing: "-0.02em" }}>IV Hub</span>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{session?.user?.name}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--primary)" }}
          >
            {session?.user?.initials || session?.user?.name?.split(" ").map((w) => w[0]).join("")}
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

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        {page === "home" && (
          <div className="p-4 space-y-3">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border" style={{ padding: "14px 16px", borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Total</div>
                <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{ color: "var(--text-1)" }}>{dashboard?.counts.total || 0}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{todayLabel}</div>
              </div>
              <div className="rounded-xl border" style={{ padding: "14px 16px", borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Completed</div>
                <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{ color: "var(--status-completed)" }}>{dashboard?.counts.completed || 0}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{completedPct}%</div>
              </div>
              <div className="rounded-xl border" style={{ padding: "14px 16px", borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>In Progress</div>
                <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{ color: "var(--status-progress)" }}>{inProgressTotal}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{dashboard?.counts.ontheway || 0} on way</div>
              </div>
              <div className="rounded-xl border" style={{ padding: "14px 16px", borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Unassigned</div>
                <div className="text-2xl font-extrabold tabular-nums leading-tight" style={{ color: "var(--status-unassigned)" }}>{dashboard?.counts.unassigned || 0}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Needs action</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "var(--text-2)" }}>Upcoming Bookings</h3>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{upcomingTotal} total</span>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {["all", "unassigned", "assigned", "ontheway"].map((f) => (
                <button
                  key={f}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: homeFilter === f ? "var(--primary)" : "var(--bg-card)",
                    color: homeFilter === f ? "#fff" : "var(--text-2)",
                    border: `1px solid ${homeFilter === f ? "var(--primary)" : "var(--border)"}`,
                  }}
                  onClick={() => setHomeFilter(f)}
                >
                  {f === "all" ? "All" : f === "ontheway" ? "On Way" : f === "progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1 opacity-70">{homeCounts[f] ?? ""}</span>
                </button>
              ))}
            </div>

            {!upcomingLoaded ? (
              <BookingListSkeleton />
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isAdmin
                    onDetail={(bk) => setDetailId(bk.id)}
                    onAssign={(bk) => setAssignTarget(bk)}
                    onStatus={(bk) => setStatusTarget(bk)}
                  />
                ))}
                {upcoming.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>No upcoming bookings</p>
                  </div>
                )}
              </div>
            )}

            {upcomingTotal > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  disabled={upcomingPage <= 1}
                  onClick={() => setUpcomingPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-30"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  ← Prev
                </button>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>
                  Page {upcomingPage} of {Math.max(1, Math.ceil(upcomingTotal / PAGE_SIZE))}
                </span>
                <button
                  disabled={upcomingPage >= Math.ceil(upcomingTotal / PAGE_SIZE)}
                  onClick={() => setUpcomingPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-30"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {page === "history" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>History</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>{bookingsTotal} total</span>
            </div>

            {filterUI}
          </div>
        )}

        {page === "team" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-extrabold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>Team</span>
              <button
                className="font-semibold text-white"
                style={{ background: "var(--primary)", padding: "7px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                onClick={() => setShowAddNurse(true)}
              >
                + Add
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {(["active", "inactive"] as const).map((f) => {
                const count = nurses.filter((n) => (f === "active" ? n.isActive !== false : n.isActive === false)).length;
                return (
                  <button
                    key={f}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: teamFilter === f ? "var(--primary)" : "var(--bg-card)",
                      color: teamFilter === f ? "#fff" : "var(--text-2)",
                      border: `1px solid ${teamFilter === f ? "var(--primary)" : "var(--border)"}`,
                    }}
                    onClick={() => setTeamFilter(f)}
                  >
                    {f === "active" ? "Active" : "Not Active"}
                    <span className="ml-1 opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {nurses.filter((n) => (teamFilter === "active" ? n.isActive !== false : n.isActive === false)).map((n) => {
              const suspended = n.isActive === false;
              const active = n._count?.active || 0;
              const done = n._count?.done || 0;
              const total = n._count?.total || 0;
              return (
                <div
                  key={n.id}
                  className="rounded-xl border relative"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)", padding: "16px", marginBottom: "10px", opacity: suspended ? 0.6 : 1 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ width: "44px", height: "44px", fontSize: "15px", background: suspended ? "var(--text-3)" : "var(--primary)" }}>
                      {n.initials || n.name.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold truncate" style={{ fontSize: "16px", color: "var(--text-1)" }}>{n.name}</div>
                        {suspended && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--status-cancelled)", color: "#fff" }}>
                            Not Active
                          </span>
                        )}
                      </div>
                      {n.email && (
                        <div className="truncate" style={{ fontSize: "12px", color: "var(--text-3)" }}>{n.email}</div>
                      )}
                      {n.phone && (
                        <div className="truncate" style={{ fontSize: "12px", color: "var(--text-3)" }}>{n.phone}</div>
                      )}
                    </div>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--bg)]"
                      style={{ color: "var(--text-3)" }}
                      onClick={() => setNurseActionsOpen(nurseActionsOpen === n.id ? null : n.id)}
                      title="Actions"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                    </button>

                    {nurseActionsOpen === n.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setNurseActionsOpen(null)} />
                        <div
                          className="absolute right-0 top-10 rounded-xl border shadow-lg p-1.5 min-w-[170px] z-20"
                          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
                        >
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg text-sm"
                            style={{ color: "var(--text-1)" }}
                            onClick={() => {
                              setResetPasswordTarget(n);
                              setNurseActionsOpen(null);
                            }}
                          >
                            Reset Password
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg text-sm"
                            style={{ color: suspended ? "var(--status-completed)" : "var(--status-cancelled)" }}
                            onClick={() => {
                              toggleNurseActive(n);
                              setNurseActionsOpen(null);
                            }}
                          >
                            {suspended ? "Set Active" : "Set Not Active"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex" style={{ gap: "20px" }}>
                    <div>
                      <span className="font-bold" style={{ fontSize: "20px", color: "var(--status-assigned)" }}>{active}</span>
                      <br />
                      <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Active</span>
                    </div>
                    <div>
                      <span className="font-bold" style={{ fontSize: "20px", color: "var(--status-completed)" }}>{done}</span>
                      <br />
                      <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Done</span>
                    </div>
                    <div>
                      <span className="font-bold" style={{ fontSize: "20px", color: "var(--text-1)" }}>{total}</span>
                      <br />
                      <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Total</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        className="fixed right-4 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg active:scale-95 transition-transform"
        style={{ background: "var(--accent)", bottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}
        onClick={() => setShowCreate(true)}
      >
        +
      </button>

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
          {navItems.map((item) => {
            const key = item.href.replace("#", "") as Page;
            const active = page === key;
            return (
              <button
                key={key}
                onClick={() => setPage(key)}
                className="flex flex-col items-center transition-colors rounded-lg hover:bg-[var(--bg)]"
                style={{ gap: "2px", padding: "6px 16px", color: active ? "var(--primary)" : "var(--text-3)" }}
              >
                <span className="w-6 h-6">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {detailId && (
        <BookingDetail
          bookingId={detailId}
          isAdmin
          onClose={() => setDetailId(null)}
          onUpdate={refreshCurrentView}
          nurses={nurses}
        />
      )}

      {statusTarget && (
        <StatusDropdown
          currentStatus={statusTarget.status}
          onSelect={handleStatusChange}
          onClose={() => setStatusTarget(null)}
        />
      )}

      {assignTarget && (
        <AssignDropdown
          nurses={nurses}
          onSelect={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {showCreate && (
        <CreateBookingModal
          nurses={nurses}
          onClose={() => setShowCreate(false)}
          onCreated={refreshCurrentView}
        />
      )}

      {showAddNurse && (
        <AddNurseModal
          onClose={() => setShowAddNurse(false)}
          onCreated={loadNurses}
        />
      )}

      {resetPasswordTarget && (
        <ResetPasswordModal
          nurseName={resetPasswordTarget.name}
          onSubmit={resetNursePassword}
          onClose={() => setResetPasswordTarget(null)}
        />
      )}
    </div>
  );
}
