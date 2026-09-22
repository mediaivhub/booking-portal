import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineUsage } from "@/lib/booking-vials";

// Mirrors the search filter on the Medicines (Bulk) tab so the export matches what's on screen.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search")?.toLowerCase();

  const items = await prisma.bulkMedicine.findMany({
    where: { isActive: true },
    include: {
      locations: true,
      assignments: { include: { nurse: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  const usage = await medicineUsage(items.map((m) => m.id));

  const rows = items
    .filter((m) => !search || m.name.toLowerCase().includes(search))
    .map((m) => {
      const qty = Number(m.qty);
      const used = Math.round((usage.all.get(m.id) ?? 0) * 100) / 100;
      return {
        name: m.name,
        unit: m.unit,
        expiry: m.expiry ? m.expiry.toISOString().slice(0, 10) : "",
        qty,
        used,
        available: Math.max(0, Math.round((qty - used) * 100) / 100),
        locations: m.locations.map((l) => `${l.location} (${Number(l.qty)})`).join(", "),
        assignedTo: m.assignments.map((a) => `${a.nurse.name} (${Number(a.qty)})`).join(", "),
      };
    });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bulk Medicines");
  sheet.columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Expiry", key: "expiry", width: 12 },
    { header: "Master Qty", key: "qty", width: 12 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Used", key: "used", width: 10 },
    { header: "Available", key: "available", width: 10 },
    { header: "Locations", key: "locations", width: 30 },
    { header: "Assigned To", key: "assignedTo", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const m of rows) sheet.addRow(m);

  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bulk_medicines_${today}.xlsx"`,
    },
  });
}
