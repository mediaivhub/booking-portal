import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const nurseId = searchParams.get("nurseId");
  const service = searchParams.get("service");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};

  if (nurseId) where.nurseId = parseInt(nurseId);
  if (service) where.service = service;

  if (dateFrom || dateTo) {
    where.bookingDate = {};
    if (dateFrom) (where.bookingDate as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.bookingDate as Record<string, unknown>).lte = new Date(dateTo);
  }

  if (status && status !== "all") {
    const statuses = status.split(",");
    where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
  }

  if (search) {
    // See the same note in /api/bookings/route.ts — collation mismatch on
    // joined LIKE comparisons means client/nurse matches resolve separately.
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

    where.OR = [
      { taskId: { contains: search } },
      { orderId: { contains: search } },
      { address: { contains: search } },
      { description: { contains: search } },
      { service: { contains: search } },
      ...(matchingClients.length ? [{ clientId: { in: matchingClients.map((c) => c.id) } }] : []),
      ...(matchingNurses.length ? [{ nurseId: { in: matchingNurses.map((n) => n.id) } }] : []),
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: true,
      nurse: { select: { name: true } },
    },
    orderBy: { bookingDate: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bookings");

  sheet.columns = [
    { header: "Task ID", key: "taskId", width: 14 },
    { header: "Order ID", key: "orderId", width: 14 },
    { header: "Job ID", key: "jobId", width: 14 },
    { header: "Date", key: "bookingDate", width: 12 },
    { header: "Time", key: "timeSlot", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Client", key: "clientName", width: 20 },
    { header: "Client Phone", key: "clientPhone", width: 16 },
    { header: "Client Email", key: "clientEmail", width: 24 },
    { header: "Nurse", key: "nurseName", width: 20 },
    { header: "Service", key: "service", width: 16 },
    { header: "Description", key: "description", width: 30 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Address", key: "address", width: 30 },
    { header: "Created At", key: "createdAt", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("bookingDate").numFmt = "dd/mm/yyyy";

  for (const b of bookings) {
    sheet.addRow({
      taskId: b.taskId,
      orderId: b.orderId || "",
      jobId: b.jobId || "",
      bookingDate: b.bookingDate || "",
      timeSlot: b.timeSlot || "",
      status: b.status,
      clientName: b.client.name,
      clientPhone: b.client.phone || "",
      clientEmail: b.client.email || "",
      nurseName: b.nurse?.name || "Unassigned",
      service: b.service || "",
      description: b.description || "",
      paymentMethod: b.paymentMethod || "",
      address: b.address || "",
      createdAt: b.createdAt.toISOString().slice(0, 19).replace("T", " "),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : "all";

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bookings_${suffix}.xlsx"`,
    },
  });
}
