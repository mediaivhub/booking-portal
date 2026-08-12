import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const nurseId = searchParams.get("nurseId");
  const service = searchParams.get("service");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (nurseId) {
    where.nurseId = parseInt(nurseId);
  }

  if (service) {
    where.service = service;
  }

  if (dateFrom || dateTo) {
    where.bookingDate = {};
    if (dateFrom) (where.bookingDate as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.bookingDate as Record<string, unknown>).lte = new Date(dateTo);
  }

  if (session.user.role === "nurse") {
    where.nurseId = parseInt(session.user.id);
  }

  if (search) {
    where.OR = [
      { taskId: { contains: search } },
      { orderId: { contains: search } },
      { address: { contains: search } },
      { description: { contains: search } },
      { service: { contains: search } },
      { client: { name: { contains: search } } },
      { client: { phone: { contains: search } } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  let client = await prisma.client.findFirst({
    where: { name: body.clientName, phone: body.clientPhone },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: body.clientName,
        phone: body.clientPhone || null,
        email: body.clientEmail || null,
        address: body.address || null,
      },
    });
  }

  const lastBooking = await prisma.booking.findFirst({
    orderBy: { taskId: "desc" },
  });
  const nextTaskNum =
    lastBooking && lastBooking.taskId.startsWith("#")
      ? parseInt(lastBooking.taskId.slice(1)) + 1
      : 100000;
  const taskId = `#${nextTaskNum}`;

  const booking = await prisma.booking.create({
    data: {
      taskId,
      orderId: body.orderId || null,
      clientId: client.id,
      nurseId: body.nurseId || null,
      status: body.nurseId ? "assigned" : "unassigned",
      service: body.service || null,
      address: body.address || null,
      description: body.description || null,
      timeSlot: body.timeSlot || null,
      bookingDate: body.bookingDate ? new Date(body.bookingDate) : null,
      paymentMethod: body.paymentMethod || null,
    },
    include: {
      client: true,
      nurse: { select: { id: true, name: true, initials: true } },
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: booking.id,
      action: "Booking created",
      performedBy: session.user.name,
    },
  });

  return Response.json(booking, { status: 201 });
}
