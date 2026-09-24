import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

// Hit daily by an external scheduler (cron-job.org — this host has no cron of its own).
// Not session-gated like the rest of the API; a shared secret stands in for auth.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date(new Date().toISOString().slice(0, 10));
  const in7 = new Date(today.getTime() + 7 * 86400000);

  const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  const vials = await prisma.inventoryItem.findMany({
    where: { isActive: true, expiry: { gte: today, lte: in7 }, expiryNotifiedAt: null },
    include: { assignments: { select: { nurseId: true } } },
  });
  for (const v of vials) {
    const expiry = v.expiry!.toISOString().slice(0, 10);
    const body = `${v.name} expires ${expiry} (${Number(v.qty)} ${v.unit} left)`;
    await sendPushToUsers(adminIds, { title: "Vial expiring soon", body, url: "/admin" });
    const nurseIds = v.assignments.map((a) => a.nurseId);
    if (nurseIds.length) await sendPushToUsers(nurseIds, { title: "Vial expiring soon", body, url: "/nurse" });
    await prisma.inventoryItem.update({ where: { id: v.id }, data: { expiryNotifiedAt: new Date() } });
  }

  const medicines = await prisma.bulkMedicine.findMany({
    where: { isActive: true, expiry: { gte: today, lte: in7 }, expiryNotifiedAt: null },
    include: { assignments: { select: { nurseId: true } } },
  });
  for (const m of medicines) {
    const expiry = m.expiry!.toISOString().slice(0, 10);
    const body = `${m.name} expires ${expiry} (${Number(m.qty)} ${m.unit} left)`;
    await sendPushToUsers(adminIds, { title: "Medicine expiring soon", body, url: "/admin" });
    const nurseIds = m.assignments.map((a) => a.nurseId);
    if (nurseIds.length) await sendPushToUsers(nurseIds, { title: "Medicine expiring soon", body, url: "/nurse" });
    await prisma.bulkMedicine.update({ where: { id: m.id }, data: { expiryNotifiedAt: new Date() } });
  }

  return Response.json({ vialsNotified: vials.length, medicinesNotified: medicines.length });
}
