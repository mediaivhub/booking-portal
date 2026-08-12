import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nurses = await prisma.user.findMany({
    where: { role: "nurse" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      initials: true,
      team: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  const statusGroups = await prisma.booking.groupBy({
    by: ["nurseId", "status"],
    where: { nurseId: { in: nurses.map((n) => n.id) } },
    _count: true,
  });

  const statsByNurse = new Map<number, { active: number; done: number; total: number }>();
  for (const g of statusGroups) {
    if (g.nurseId === null) continue;
    const s = statsByNurse.get(g.nurseId) || { active: 0, done: 0, total: 0 };
    if (g.status === "assigned" || g.status === "ontheway" || g.status === "progress") s.active += g._count;
    if (g.status === "completed") s.done += g._count;
    s.total += g._count;
    statsByNurse.set(g.nurseId, s);
  }

  const result = nurses.map((n) => ({
    ...n,
    _count: statsByNurse.get(n.id) || { active: 0, done: 0, total: 0 },
  }));

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return Response.json({ error: "Email already exists" }, { status: 409 });
  }

  const initials = body.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const passwordHash = await bcrypt.hash(body.password || "nurse123", 10);

  const nurse = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      passwordHash,
      role: "nurse",
      team: body.team || "Nurses",
      initials,
    },
  });

  return Response.json(nurse, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  await prisma.user.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  return Response.json({ success: true });
}
