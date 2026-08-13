import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToAdmins, sendPushToUsers } from "@/lib/push";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = [
    "unassigned",
    "assigned",
    "ontheway",
    "progress",
    "completed",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });
  if (!booking) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "nurse") {
    if (booking.nurseId !== parseInt(session.user.id)) {
      return Response.json({ error: "Not your booking" }, { status: 403 });
    }
  }

  if (booking.status === status) {
    const unchanged = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        nurse: { select: { id: true, name: true, initials: true } },
      },
    });
    return Response.json(unchanged);
  }

  const statusLabels: Record<string, string> = {
    unassigned: "Unassigned",
    assigned: "Assigned",
    ontheway: "On the Way",
    progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const updated = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: { status },
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true } },
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: updated.id,
      action: `Status → ${statusLabels[status]}`,
      performedBy: session.user.name,
    },
  });

  if (session.user.role === "nurse") {
    await sendPushToAdmins({
      title: "Booking status updated",
      body: `${updated.taskId} · ${updated.client.name} · now ${statusLabels[status]} · by ${session.user.name}`,
      url: "/admin",
    });
  } else if (session.user.role === "admin" && updated.nurseId) {
    await sendPushToUsers([updated.nurseId], {
      title: "Booking status updated",  
      body: `${updated.taskId} · ${updated.client.name} · now ${statusLabels[status]}`,
      url: "/nurse",
    });
  }

  return Response.json(updated);
}
