import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

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

  const data: { isActive?: boolean; passwordHash?: string } = {};

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (body.password) {
    if (body.password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const nurse = await prisma.user.update({
    where: { id: parseInt(id) },
    data,
    select: { id: true, name: true, email: true, isActive: true },
  });

  return Response.json(nurse);
}
