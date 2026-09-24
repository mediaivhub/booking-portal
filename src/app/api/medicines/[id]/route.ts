import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineUsage } from "@/lib/booking-vials";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt((await params).id);
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.unit === "string" && body.unit.trim()) data.unit = body.unit.trim();
  // Editing the expiry re-arms the expiry-check cron so it can notify again if needed.
  if ("expiry" in body) {
    data.expiry = body.expiry ? new Date(body.expiry) : null;
    data.expiryNotifiedAt = null;
  }
  if (body.qty !== undefined) {
    const qty = Number(body.qty);
    if (!Number.isFinite(qty) || qty < 0) return Response.json({ error: "Invalid quantity" }, { status: 400 });
    data.qty = qty;
  }

  // Optional replace of the location split and/or nurse assignments, same shape as create.
  // Zero/blank rows are dropped, same as the create flow; anything not resubmitted is removed.
  if (Array.isArray(body.locations)) {
    const locations = body.locations
      .map((l: { location?: unknown; qty?: unknown }) => ({ location: String(l.location || "").trim(), qty: Number(l.qty) }))
      .filter((l: { location: string; qty: number }) => l.location && Number.isFinite(l.qty) && l.qty > 0);
    await prisma.bulkMedicineLocation.deleteMany({ where: { medicineId: id, location: { notIn: locations.map((l: { location: string }) => l.location) } } });
    for (const l of locations) {
      await prisma.bulkMedicineLocation.upsert({
        where: { medicineId_location: { medicineId: id, location: l.location } },
        create: { medicineId: id, location: l.location, qty: l.qty },
        update: { qty: l.qty },
      });
    }
  }

  if (Array.isArray(body.nurseAssignments)) {
    const assignments = body.nurseAssignments
      .map((a: { nurseId?: unknown; qty?: unknown }) => ({ nurseId: Number(a.nurseId), qty: Number(a.qty) }))
      .filter((a: { nurseId: number; qty: number }) => Number.isFinite(a.nurseId) && a.nurseId > 0 && Number.isFinite(a.qty) && a.qty > 0);
    // A nurse's split can't drop below what they've already used in bookings.
    const used = await medicineUsage([id]);
    for (const a of assignments) {
      const usedByNurse = used.byNurse.get(`${id}:${a.nurseId}`) ?? 0;
      if (a.qty < usedByNurse) {
        return Response.json({ error: `A nurse has already used ${usedByNurse} — can't set their split below that` }, { status: 400 });
      }
    }
    await prisma.bulkMedicineAssignment.deleteMany({ where: { medicineId: id, nurseId: { notIn: assignments.map((a: { nurseId: number }) => a.nurseId) } } });
    for (const a of assignments) {
      await prisma.bulkMedicineAssignment.upsert({
        where: { medicineId_nurseId: { medicineId: id, nurseId: a.nurseId } },
        create: { medicineId: id, nurseId: a.nurseId, qty: a.qty },
        update: { qty: a.qty },
      });
    }
  }

  const item = await prisma.bulkMedicine.update({ where: { id }, data });
  return Response.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt((await params).id);
  await prisma.bulkMedicine.update({ where: { id }, data: { isActive: false } });
  return Response.json({ success: true });
}
