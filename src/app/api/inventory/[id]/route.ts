import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vialUsage } from "@/lib/booking-vials";
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
  if ("location" in body) data.location = body.location ? String(body.location).trim() : null;
  if ("expiry" in body) data.expiry = body.expiry ? new Date(body.expiry) : null;
  if (typeof body.serial === "string" && body.serial.trim()) {
    const serial = body.serial.trim();
    const clash = await prisma.inventoryItem.findFirst({ where: { serial, NOT: { id } } });
    if (clash) return Response.json({ error: "Serial already exists" }, { status: 409 });
    data.serial = serial;
  }
  let newQty: number | null = null;
  if (body.qty !== undefined) {
    const qty = Number(body.qty);
    if (!Number.isFinite(qty) || qty < 0) return Response.json({ error: "Invalid quantity" }, { status: 400 });
    const usage = await vialUsage([id]);
    const used = usage.all.get(id) ?? 0;
    if (qty < used) {
      return Response.json({ error: `Quantity is less than the ${used} already used in bookings` }, { status: 400 });
    }
    data.qty = qty;
    newQty = qty;
  }

  const item = await prisma.inventoryItem.update({ where: { id }, data });
  // A vial is assigned whole, so the nurse's amount follows the vial's quantity.
  if (newQty !== null) await prisma.inventoryAssignment.updateMany({ where: { itemId: id }, data: { qty: newQty } });
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
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  return Response.json({ success: true });
}
