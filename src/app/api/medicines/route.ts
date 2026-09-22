import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineUsage, medicineUsages } from "@/lib/booking-vials";
import { NextRequest } from "next/server";

// Bulk ("master") medicines held in the office inventory. Admin only.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.bulkMedicine.findMany({
    where: { isActive: true },
    include: {
      locations: true,
      assignments: { include: { nurse: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  const ids = items.map((m) => m.id);
  // The booking form passes excludeBooking so a booking's own saved drips aren't counted as already used,
  // and nurseId so a nurse only sees medicines that are either unassigned (shared stock) or assigned to them.
  const exclude = Number(req.nextUrl.searchParams.get("excludeBooking")) || undefined;
  const nurseId = Number(req.nextUrl.searchParams.get("nurseId")) || null;
  const [usage, usages] = await Promise.all([medicineUsage(ids, exclude), medicineUsages(ids)]);
  const visible = nurseId ? items.filter((m) => m.assignments.length === 0 || m.assignments.some((a) => a.nurseId === nurseId)) : items;
  return Response.json(
    visible.map((m) => {
      const qty = Number(m.qty);
      // Used = completed bookings only; open bookings just reserve (see usages).
      const used = Math.round((usage.all.get(m.id) ?? 0) * 100) / 100;
      const pool = Math.max(0, Math.round((qty - used) * 100) / 100);
      const mine = nurseId ? m.assignments.find((a) => a.nurseId === nurseId) : undefined;
      // Only nurse-restricted once the medicine has been split to specific nurses; otherwise it's shared stock.
      const left = !nurseId
        ? pool
        : m.assignments.length === 0
          ? pool
          : Math.max(0, Math.round((Number(mine?.qty ?? 0) - (usage.byNurse.get(`${m.id}:${nurseId}`) ?? 0)) * 100) / 100);
      return {
        id: m.id,
        name: m.name,
        unit: m.unit,
        expiry: m.expiry ? m.expiry.toISOString().slice(0, 10) : null,
        qty,
        used,
        pool,
        left,
        usages: usages.get(m.id) ?? [],
        locations: m.locations.map((l) => ({ location: l.location, qty: Number(l.qty) })),
        assignments: m.assignments.map((a) => ({ nurseId: a.nurseId, nurseName: a.nurse.name, qty: Number(a.qty) })),
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const qty = Number(body.qty);
  if (!name) return Response.json({ error: "Medicine name is required" }, { status: 400 });
  if (!Number.isFinite(qty) || qty < 0) return Response.json({ error: "Invalid quantity" }, { status: 400 });

  // Optional split of the master quantity across locations and/or nurses; zero/blank rows are dropped.
  const locations = Array.isArray(body.locations)
    ? body.locations
        .map((l: { location?: unknown; qty?: unknown }) => ({ location: String(l.location || "").trim(), qty: Number(l.qty) }))
        .filter((l: { location: string; qty: number }) => l.location && Number.isFinite(l.qty) && l.qty > 0)
    : [];
  const assignments = Array.isArray(body.nurseAssignments)
    ? body.nurseAssignments
        .map((a: { nurseId?: unknown; qty?: unknown }) => ({ nurseId: Number(a.nurseId), qty: Number(a.qty) }))
        .filter((a: { nurseId: number; qty: number }) => Number.isFinite(a.nurseId) && a.nurseId > 0 && Number.isFinite(a.qty) && a.qty > 0)
    : [];

  const item = await prisma.bulkMedicine.create({
    data: {
      name,
      qty,
      unit: String(body.unit || "ml").trim() || "ml",
      expiry: body.expiry ? new Date(body.expiry) : null,
      ...(locations.length ? { locations: { create: locations } } : {}),
      ...(assignments.length ? { assignments: { create: assignments } } : {}),
    },
  });
  return Response.json(item, { status: 201 });
}
