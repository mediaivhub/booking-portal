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
  const { nurseId } = await req.json();

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
      nurse: { select: { id: true, name: true, initials: true } },
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

  return Response.json(updated);
}
