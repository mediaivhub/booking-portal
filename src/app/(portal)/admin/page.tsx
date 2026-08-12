"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import BookingCard, { BookingData } from "@/components/BookingCard";
import BookingDetail from "@/components/BookingDetail";
import StatusDropdown from "@/components/StatusDropdown";
import AssignDropdown from "@/components/AssignDropdown";
import CreateBookingModal from "@/components/CreateBookingModal";
import AddNurseModal from "@/components/AddNurseModal";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

type Page = "home" | "bookings" | "history" | "team";

interface NurseInfo {
  id: number;
  name: string;
  initials?: string;
  email?: string;
  phone?: string;
  team?: string;
  _count?: { bookings: number };
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
  const [nurseFilter, setNurseFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "nurse") router.push("/nurse");
  }, [status, session, router]);

  const loadBookings = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filter !== "all") params.status = filter;
    if (search) params.search = search;
    if (nurseFilter) params.nurseId = nurseFilter;
    if (serviceFilter) params.service = serviceFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const data = await api.bookings.list(params);
    setBookings(data);
  }, [filter, search, nurseFilter, serviceFilter, dateFrom, dateTo]);

  const loadNurses = useCallback(async () => {
    const data = await api.nurses.list();
    setNurses(data);
  }, []);

  const loadDashboard = useCallback(async () => {
    const data = await api.dashboard();
    setDashboard(data);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadBookings();
      loadNurses();
      loadDashboard();
    }
  }, [status, loadBookings, loadNurses, loadDashboard]);

  async function handleStatusChange(newStatus: string) {
    if (!statusTarget) return;
    try {
      await api.bookings.updateStatus(statusTarget.id, newStatus);
      toast("Status updated");
      setStatusTarget(null);
      loadBookings();
      loadDashboard();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function handleAssign(nurseId: number) {
    if (!assignTarget) return;
    try {
      await api.bookings.assign(assignTarget.id, nurseId);
      toast("Nurse assigned");
      setAssignTarget(null);
      loadBookings();
      loadDashboard();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  async function removeNurse(id: number) {
    try {
      await api.nurses.remove(id);
      toast("Nurse removed");
      loadNurses();
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

  const services = [...new Set(bookings.map((b) => b.service).filter(Boolean))];

  const hasActiveFilters = nurseFilter || serviceFilter || dateFrom || dateTo;

  function clearFilters() {
    setNurseFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const counts = {
    all: bookings.length,
    unassigned: bookings.filter((b) => b.status === "unassigned").length,
    assigned: bookings.filter((b) => b.status === "assigned").length,
    ontheway: bookings.filter((b) => b.status === "ontheway").length,
    progress: bookings.filter((b) => b.status === "progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const navItems = [
    {
      label: "Home",
      href: "#home",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
      label: "Bookings",
      href: "#bookings",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
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
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--primary)" }}>IV</div>
          <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>IV Hub Admin</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
        >
          Logout
        </button>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        {page === "home" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Dashboard</h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: dashboard?.counts.total || 0, color: "var(--primary)" },
                { label: "Unassigned", value: dashboard?.counts.unassigned || 0, color: "var(--status-unassigned)" },
                { label: "Active", value: (dashboard?.counts.assigned || 0) + (dashboard?.counts.ontheway || 0) + (dashboard?.counts.progress || 0), color: "var(--status-progress)" },
                { label: "On Way", value: dashboard?.counts.ontheway || 0, color: "var(--status-ontheway)" },
                { label: "Done", value: dashboard?.counts.completed || 0, color: "var(--status-completed)" },
                { label: "Cancelled", value: dashboard?.counts.cancelled || 0, color: "var(--status-cancelled)" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3 text-center border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-3)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Nurse Workload */}
            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-2)" }}>Nurse Workload</h3>
              <div className="space-y-2">
                {(dashboard?.nurses || []).map((n) => (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--primary)" }}>
                      {n.initials || n.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.name}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{n._count?.bookings || 0}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-3)" }}>active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {page === "bookings" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Bookings</h2>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{bookings.length} total</span>
            </div>

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
              {["all", "unassigned", "assigned", "ontheway", "progress", "completed"].map((f) => (
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
                  <span className="ml-1 opacity-70">{counts[f as keyof typeof counts] ?? ""}</span>
                </button>
              ))}
            </div>

            {/* Filter Dropdowns — Nurse & Service */}
            <div className="flex gap-2">
              <select
                value={nurseFilter}
                onChange={(e) => setNurseFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                <option value="">All Nurses</option>
                {nurses.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                <option value="">All Services</option>
                {services.map((s) => (
                  <option key={s} value={s!}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 flex items-center gap-1.5">
                <label className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-xl border text-xs outline-none"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)" }}
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <label className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-xl border text-xs outline-none"
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
          </div>
        )}

        {page === "history" && (
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Completed</h2>
            <div className="space-y-3">
              {bookings
                .filter((b) => b.status === "completed" || b.status === "cancelled")
                .map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isAdmin
                    onDetail={(bk) => setDetailId(bk.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {page === "team" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Team</h2>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "var(--primary)" }}
                onClick={() => setShowAddNurse(true)}
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {nurses.map((n) => (
                <div key={n.id} className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
                    {n.initials || n.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{n.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{n.email}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>{n._count?.bookings || 0}</p>
                    <p className="text-[9px]" style={{ color: "var(--text-3)" }}>bookings</p>
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ color: "var(--status-cancelled)" }}
                    onClick={() => removeNurse(n.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
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
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {navItems.map((item) => {
          const key = item.href.replace("#", "") as Page;
          const active = page === key;
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
              style={{ color: active ? "var(--primary)" : "var(--text-3)" }}
            >
              <span className="w-6 h-6">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {detailId && (
        <BookingDetail
          bookingId={detailId}
          isAdmin
          onClose={() => setDetailId(null)}
          onUpdate={() => {
            loadBookings();
            loadDashboard();
          }}
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
          onCreated={() => {
            loadBookings();
            loadDashboard();
          }}
        />
      )}

      {showAddNurse && (
        <AddNurseModal
          onClose={() => setShowAddNurse(false)}
          onCreated={loadNurses}
        />
      )}
    </div>
  );
}
