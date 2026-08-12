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

  const { id } = await params;
  const body = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });
  if (!booking) return Response.json({ error: "Not found" }, { status: 404 });

  if (booking.status === "completed" || booking.status === "cancelled") {
    return Response.json(
      { error: "Cannot edit completed/cancelled bookings" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.service !== undefined) updateData.service = body.service;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.timeSlot !== undefined) updateData.timeSlot = body.timeSlot;
  if (body.bookingDate !== undefined)
    updateData.bookingDate = body.bookingDate ? new Date(body.bookingDate) : null;
  if (body.paymentMethod !== undefined)
    updateData.paymentMethod = body.paymentMethod;
  if (body.orderId !== undefined) updateData.orderId = body.orderId;

  if (body.clientName || body.clientPhone) {
    const client = await prisma.client.findUnique({
      where: { id: booking.clientId },
    });
    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          ...(body.clientName && { name: body.clientName }),
          ...(body.clientPhone && { phone: body.clientPhone }),
        },
      });
    }
  }

  const updated = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true } },
    },
  });

  const changes = Object.keys(updateData)
    .map((k) => k.replace(/([A-Z])/g, " $1").toLowerCase())
    .join(", ");

  await prisma.bookingHistory.create({
    data: {
      bookingId: updated.id,
      action: `Edited: ${changes}`,
      performedBy: session.user.name,
    },
  });

  return Response.json(updated);
}
