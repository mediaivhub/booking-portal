import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Assigns a whole vial to one nurse (replacing any current holder), or unassigns it with nurseId = null.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = parseInt((await params).id);
  const { nurseId } = await req.json();

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) return Response.json({ error: "Vial not found" }, { status: 404 });

  if (nurseId) {
    const nurse = await prisma.user.findFirst({ where: { id: Number(nurseId), role: "nurse", isActive: true } });
    if (!nurse) return Response.json({ error: "Nurse not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.inventoryAssignment.deleteMany({ where: { itemId } }),
    ...(nurseId
      ? [prisma.inventoryAssignment.create({ data: { itemId, nurseId: Number(nurseId), qty: item.qty } })]
      : []),
  ]);
  return Response.json({ success: true });
}
