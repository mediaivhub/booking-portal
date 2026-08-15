import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { sendBookingAssignedEmail } from "@/lib/email";
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
  const { nurseId } = await req.json();

  const existing = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (existing.nurseId === (nurseId || null)) {
    const unchanged = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        nurse: { select: { id: true, name: true, initials: true } },
      },
    });
    return Response.json(unchanged);
  }

  const nurse = nurseId
    ? await prisma.user.findUnique({ where: { id: nurseId } })
    : null;

  const updated = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: {
      nurseId: nurseId || null,
      status: nurseId ? "assigned" : "unassigned",
    },
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true, email: true } },
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: updated.id,
      action: nurseId
        ? `Assigned to ${nurse?.name}`
        : "Unassigned",
      performedBy: session.user.name,
    },
  });

  // Previously assigned nurse is being replaced or removed — let them know.
  if (existing.nurseId && existing.nurseId !== (nurseId || null)) {
    await sendPushToUsers([existing.nurseId], {
      title: nurseId ? "Booking reassigned" : "Booking unassigned",
      body: nurseId
        ? `${updated.taskId} has been reassigned to ${nurse?.name ?? "another nurse"}`
        : `${updated.taskId} has been Removed from you`,
      url: "/nurse",
    });
  }

  if (nurseId && updated.nurse) {
    await sendPushToUsers([nurseId], {
      title: "New booking assigned",
      body: `${updated.taskId} · ${updated.client.name} · ${updated.timeSlot || "No time set"}`,
      url: "/nurse",
    });
    const createdEntry = await prisma.bookingHistory.findFirst({
      where: { bookingId: updated.id, action: "Booking created" },
      select: { performedBy: true },
    });
    await sendBookingAssignedEmail(updated.nurse.email, {
      ...updated,
      nurse: updated.nurse,
      createdBy: createdEntry?.performedBy ?? session.user.name,
    });
  }

  return Response.json(updated);
}
