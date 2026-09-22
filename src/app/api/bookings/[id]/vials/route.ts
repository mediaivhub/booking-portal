import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateDrips, dripsCreateData } from "@/lib/booking-vials";
import { NextRequest } from "next/server";

// Replaces the drip & vial lines recorded on a booking.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt((await params).id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return Response.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "cancelled") {
    return Response.json({ error: "Cannot edit cancelled bookings" }, { status: 400 });
  }

  const { drips } = await req.json();
  const checked = await validateDrips(drips, booking.nurseId, id, booking.location);
  if ("error" in checked) return Response.json({ error: checked.error }, { status: 400 });

  await prisma.$transaction([
    prisma.bookingDrip.deleteMany({ where: { bookingId: id } }),
    ...dripsCreateData(checked.drips).map((d) => prisma.bookingDrip.create({ data: { ...d, bookingId: id } })),
    prisma.bookingHistory.create({
      data: { bookingId: id, action: "Edited: drip & vial tracking", performedBy: session.user.name },
    }),
  ]);

  return Response.json({ success: true });
}
