import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true, phone: true } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(booking);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.booking.delete({ where: { id: parseInt(id) } });

  return Response.json({ success: true });
}
