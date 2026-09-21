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

  const items = await prisma.bulkMedicine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const ids = items.map((m) => m.id);
  // The booking form passes excludeBooking so a booking's own saved drips aren't counted as already used.
  const exclude = Number(req.nextUrl.searchParams.get("excludeBooking")) || undefined;
  const [usedMap, usages] = await Promise.all([medicineUsage(ids, exclude), medicineUsages(ids)]);
  return Response.json(
    items.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      expiry: m.expiry ? m.expiry.toISOString().slice(0, 10) : null,
      qty: Number(m.qty),
      // Used = completed bookings only; open bookings just reserve (see usages).
      used: Math.round((usedMap.get(m.id) ?? 0) * 100) / 100,
      usages: usages.get(m.id) ?? [],
    }))
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

  const item = await prisma.bulkMedicine.create({
    data: {
      name,
      qty,
      unit: String(body.unit || "ml").trim() || "ml",
      expiry: body.expiry ? new Date(body.expiry) : null,
    },
  });
  return Response.json(item, { status: 201 });
}
