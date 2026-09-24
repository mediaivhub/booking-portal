import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
