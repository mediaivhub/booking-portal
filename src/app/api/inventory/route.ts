import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vialUsage, vialUsages } from "@/lib/booking-vials";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Admins can ask for one nurse's stock (used by the booking form).
  const forNurse = req.nextUrl.searchParams.get("nurseId");
  if (session.user.role === "admin" && !forNurse) {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { assignments: { include: { nurse: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    });
    const usages = await vialUsages(items.map((i) => i.id));
    return Response.json(
      items.map((i) => {
        const qty = Number(i.qty);
        const assigned = i.assignments.reduce((s, a) => s + Number(a.qty), 0);
        const uses = usages.get(i.id) ?? [];
        return {
          id: i.id,
          name: i.name,
          serial: i.serial,
          unit: i.unit,
          location: i.location,
          expiry: i.expiry ? i.expiry.toISOString().slice(0, 10) : null,
          qty,
          assigned,
          used: Math.round(uses.filter((u) => u.completed).reduce((s, u) => s + u.qty, 0) * 100) / 100,
          usages: uses,
          assignments: i.assignments.map((a) => ({
            nurseId: a.nurseId,
            nurseName: a.nurse.name,
            qty: Number(a.qty),
          })),
        };
      })
    );
  }

  // Nurses only see the stock assigned to them.
  const isAdminLookup = session.user.role === "admin";
  const nurseId = forNurse ? Number(forNurse) : Number(session.user.id);
  const exclude = Number(req.nextUrl.searchParams.get("excludeBooking")) || undefined;
  const mine = await prisma.inventoryAssignment.findMany({
    where: { nurseId, item: { isActive: true } },
    include: { item: true },
    orderBy: { item: { name: "asc" } },
  });
  const usage = isAdminLookup ? await vialUsage(mine.map((a) => a.itemId), exclude) : null;
  return Response.json(
    mine.map((a) => {
      const total = Number(a.item.qty);
      return {
        id: a.item.id,
        name: a.item.name,
        serial: a.item.serial,
        unit: a.item.unit,
        expiry: a.item.expiry ? a.item.expiry.toISOString().slice(0, 10) : null,
        location: a.item.location,
        qty: Number(a.qty),
        assigned: 0,
        assignments: [],
        // Stock and usage figures are only for admins building a booking, not for nurses.
        ...(usage
          ? {
              total,
              // Stock not yet used in any booking, and what this nurse still has of their assigned amount.
              pool: Math.max(0, round2(total - (usage.all.get(a.itemId) ?? 0))),
              left: Math.max(0, round2(Number(a.qty) - (usage.byNurse.get(`${a.itemId}:${nurseId}`) ?? 0))),
            }
          : {}),
      };
    })
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const serial = String(body.serial || "").trim();
  const qty = Number(body.qty);
  if (!name || !serial) return Response.json({ error: "Name and serial are required" }, { status: 400 });
  if (!Number.isFinite(qty) || qty < 0) return Response.json({ error: "Invalid quantity" }, { status: 400 });

  const existing = await prisma.inventoryItem.findUnique({ where: { serial } });
  if (existing) return Response.json({ error: "Serial already exists" }, { status: 409 });

  const item = await prisma.inventoryItem.create({
    data: {
      name,
      serial,
      qty,
      unit: String(body.unit || "ml").trim() || "ml",
      location: body.location ? String(body.location).trim() : null,
      expiry: body.expiry ? new Date(body.expiry) : null,
      // Optionally hand the whole quantity to a nurse at creation.
      ...(body.nurseId && qty > 0
        ? { assignments: { create: { nurseId: Number(body.nurseId), qty } } }
        : {}),
    },
  });
  return Response.json(item, { status: 201 });
}
