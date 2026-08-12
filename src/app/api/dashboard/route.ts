import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [total, unassigned, assigned, ontheway, progress, completed, cancelled] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "unassigned" } }),
      prisma.booking.count({ where: { status: "assigned" } }),
      prisma.booking.count({ where: { status: "ontheway" } }),
      prisma.booking.count({ where: { status: "progress" } }),
      prisma.booking.count({ where: { status: "completed" } }),
      prisma.booking.count({ where: { status: "cancelled" } }),
    ]);

  const nurses = await prisma.user.findMany({
    where: { role: "nurse", isActive: true },
    select: {
      id: true,
      name: true,
      initials: true,
      _count: {
        select: {
          bookings: {
            where: {
              status: { in: ["assigned", "ontheway", "progress"] },
            },
          },
        },
      },
    },
  });

  return Response.json({
    counts: { total, unassigned, assigned, ontheway, progress, completed, cancelled },
    nurses,
  });
}
