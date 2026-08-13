import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToAdmins, sendPushToUsers } from "@/lib/push";
import { sendBookingAssignedEmail } from "@/lib/email";

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
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const paginated = pageParam !== null || limitParam !== null;
  const page = Math.max(1, parseInt(pageParam || "1") || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "20") || 20));

  // Filters shared by both the paginated list and the status-breakdown counts.
  const baseWhere: Record<string, unknown> = {};

  if (nurseId) {
    baseWhere.nurseId = parseInt(nurseId);
  }

  if (service) {
    baseWhere.service = service;
  }

  if (dateFrom || dateTo) {
    baseWhere.bookingDate = {};
    if (dateFrom) (baseWhere.bookingDate as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (baseWhere.bookingDate as Record<string, unknown>).lte = new Date(dateTo);
  }

  if (session.user.role === "nurse") {
    baseWhere.nurseId = parseInt(session.user.id);
  }

  if (search) {
    // Client/nurse matches are resolved via separate single-table queries
    // rather than a Prisma relation filter (`client: { name: { contains } }`),
    // which would join bk_bookings to bk_clients/bk_users inside one query.
    // Prisma's MariaDB adapter binds string params over the binary protocol
    // without an explicit collation, which MariaDB treats as utf8mb4_bin —
    // joining that against this database's utf8mb4_unicode_ci columns in a
    // LIKE trips error 1267 ("Illegal mix of collations"). Resolving IDs
    // first keeps every LIKE comparison within a single table.
    const [matchingClients, matchingNurses] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: { role: "nurse", name: { contains: search } },
        select: { id: true },
      }),
    ]);

    baseWhere.OR = [
      { taskId: { contains: search } },
      { orderId: { contains: search } },
      { address: { contains: search } },
      { description: { contains: search } },
      { service: { contains: search } },
      ...(matchingClients.length ? [{ clientId: { in: matchingClients.map((c) => c.id) } }] : []),
      ...(matchingNurses.length ? [{ nurseId: { in: matchingNurses.map((n) => n.id) } }] : []),
    ];
  }

  // The list itself is further narrowed by status; the counts below intentionally
  // ignore status so the filter-pill badges always reflect true totals.
  // A comma-separated status list (e.g. "completed,cancelled") matches any of them.
  let where = baseWhere;
  if (status && status !== "all") {
    const statuses = status.split(",");
    where = statuses.length > 1 ? { ...baseWhere, status: { in: statuses } } : { ...baseWhere, status };
  }

  if (!paginated) {
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

  const [data, total, statusGroups, serviceGroups] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: true,
        nurse: { select: { id: true, name: true, initials: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
    prisma.booking.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: true,
    }),
    prisma.booking.findMany({
      where: { ...baseWhere, service: { not: null } },
      distinct: ["service"],
      select: { service: true },
      orderBy: { service: "asc" },
    }),
  ]);

  const services = serviceGroups.map((s) => s.service).filter((s): s is string => !!s);

  const counts: Record<string, number> = {
    all: 0,
    unassigned: 0,
    assigned: 0,
    ontheway: 0,
    progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const g of statusGroups) {
    counts[g.status] = g._count;
    counts.all += g._count;
  }

  return Response.json({ data, total, page, limit, counts, services });
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

  const { _max } = await prisma.booking.aggregate({ _max: { id: true } });
  const taskId = `#${100000 + (_max.id ?? 0) + 1}`;

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
      nurse: { select: { id: true, name: true, initials: true, email: true } },
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: booking.id,
      action: "Booking created",
      performedBy: session.user.name,
    },
  });

  if (booking.nurseId && booking.nurse) {
    await sendPushToUsers([booking.nurseId], {
      title: "New booking assigned",
      body: `${booking.taskId} · ${booking.client.name} · ${booking.timeSlot || "No time set"}`,
      url: "/nurse",
    });
    await sendBookingAssignedEmail(booking.nurse.email, {
      ...booking,
      nurse: booking.nurse,
      createdBy: session.user.name,
    });
  } else {
    await sendPushToAdmins(
      {
        title: "New unassigned booking",
        body: `${booking.taskId} · ${booking.client.name} needs a nurse assigned`,
        url: "/admin",
      },
      parseInt(session.user.id)
    );
  }

  return Response.json(booking, { status: 201 });
}
