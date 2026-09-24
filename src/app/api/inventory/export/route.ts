import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vialUsage, vialUsages } from "@/lib/booking-vials";

// Mirrors the filters on the Vials tab (search/location/status/staff) so the export matches what's on screen.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const location = searchParams.get("location");
  const status = searchParams.get("status");
  const staff = searchParams.get("staff");
  const search = searchParams.get("search")?.toLowerCase();

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    include: { assignments: { include: { nurse: { select: { id: true, name: true } } } } },
    orderBy: { name: "asc" },
  });
  const usage = await vialUsage(items.map((i) => i.id));
  const usages = await vialUsages(items.map((i) => i.id));

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const rows = items
    .map((i) => {
      const qty = Number(i.qty);
      const used = Math.round((usage.all.get(i.id) ?? 0) * 100) / 100;
      const expiry = i.expiry ? i.expiry.toISOString().slice(0, 10) : null;
      return {
        name: i.name,
        serial: i.serial,
        unit: i.unit,
        location: i.location,
        expiry,
        qty,
        used,
        assignments: i.assignments.map((a) => ({ nurseId: a.nurseId, nurseName: a.nurse.name, qty: Number(a.qty) })),
        // Only completed bookings count as "used" (matches the Used column); open/reserved drips aren't usage yet.
        usage: (usages.get(i.id) ?? []).filter((u) => u.completed),
      };
    })
    .filter((v) => {
      if (search && !(v.name.toLowerCase().includes(search) || v.serial.toLowerCase().includes(search))) return false;
      if (location && v.location !== location) return false;
      if (staff) {
        if (staff === "unassigned") {
          if (v.assignments.length > 0) return false;
        } else if (!v.assignments.some((a) => String(a.nurseId) === staff)) {
          return false;
        }
      }
      const expired = !!v.expiry && v.expiry < today;
      switch (status) {
        case "available": return !expired && v.qty - v.used > 0;
        case "usedup": return v.qty > 0 && v.qty - v.used <= 0;
        case "assigned": return v.assignments.length > 0;
        case "unassigned": return v.assignments.length === 0;
        case "soon": return !!v.expiry && !expired && v.expiry <= soon;
        case "expired": return expired;
        default: return true;
      }
    });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Vials");
  sheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Serial", key: "serial", width: 14 },
    { header: "Location", key: "location", width: 16 },
    { header: "Expiry", key: "expiry", width: 12 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Used", key: "used", width: 10 },
    { header: "Available", key: "available", width: 10 },
    { header: "Assigned To", key: "assignedTo", width: 30 },
    { header: "Usage", key: "usage", width: 45 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const v of rows) {
    // Same rule as the Reports view: show the location alongside any nurse assignment, not just
    // as a fallback — a vial with no nurse holding it is still sitting somewhere, not "empty".
    const assignedTo =
      [v.assignments.length > 0 ? v.assignments.map((a) => `${a.nurseName} (${a.qty})`).join(", ") : null, v.location || null]
        .filter(Boolean)
        .join(" · ") || "Unassigned";
    sheet.addRow({
      name: v.name,
      serial: v.serial,
      location: v.location || "",
      expiry: v.expiry || "",
      qty: v.qty,
      unit: v.unit,
      used: v.used,
      available: Math.max(0, Math.round((v.qty - v.used) * 100) / 100),
      assignedTo,
      usage: v.usage.map((u) => `${Math.round(u.qty * 100) / 100} ${v.unit} used in ${u.taskId} - ${u.nurseName ?? "Unassigned"}`).join("; ") || "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vials_${today}.xlsx"`,
    },
  });
}
