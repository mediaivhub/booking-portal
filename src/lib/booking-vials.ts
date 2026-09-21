import { prisma } from "@/lib/prisma";

export interface DripInput {
  kind: "cs_drip" | "upsell";
  dripName: string | null;
  nss: string | null;
  nssQty: number;
  vials: { itemId: number; qty: number }[];
  medicines: { medicineId: number; qty: number }[];
}

// How much of each vial has actually been used: only completed bookings count. Drips on open
// bookings are just reserved, and cancelled bookings count for nothing.
// `excludeBookingId` leaves out one booking, so editing it doesn't double-count its own drips.
export async function vialUsage(itemIds: number[], excludeBookingId?: number) {
  const rows = await prisma.bookingVial.findMany({
    where: {
      itemId: { in: itemIds },
      drip: { booking: { status: "completed", ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) } },
    },
    select: { itemId: true, qty: true, drip: { select: { booking: { select: { nurseId: true } } } } },
  });
  const all = new Map<number, number>();
  const byNurse = new Map<string, number>();
  for (const r of rows) {
    const q = Number(r.qty);
    all.set(r.itemId, (all.get(r.itemId) ?? 0) + q);
    const key = `${r.itemId}:${r.drip.booking.nurseId}`;
    byNurse.set(key, (byNurse.get(key) ?? 0) + q);
  }
  return { all, byNurse };
}

// Per-booking figures for each vial, for showing "X ml assigned for #ID" (open booking) or
// "X ml used for #ID" (completed). Cancelled bookings don't count.
export async function vialUsages(itemIds: number[]) {
  const rows = await prisma.bookingVial.findMany({
    where: { itemId: { in: itemIds }, drip: { booking: { status: { not: "cancelled" } } } },
    select: { itemId: true, qty: true, drip: { select: { booking: { select: { id: true, taskId: true, status: true } } } } },
    orderBy: { id: "asc" },
  });
  const out = new Map<number, { bookingId: number; taskId: string; qty: number; completed: boolean }[]>();
  for (const r of rows) {
    const list = out.get(r.itemId) ?? [];
    const b = r.drip.booking;
    const hit = list.find((x) => x.bookingId === b.id);
    if (hit) hit.qty += Number(r.qty);
    else list.push({ bookingId: b.id, taskId: b.taskId, qty: Number(r.qty), completed: b.status === "completed" });
    out.set(r.itemId, list);
  }
  return out;
}

// Bulk medicines follow the same rule as vials: completed bookings count as used, open ones only reserve.
export async function medicineUsage(medicineIds: number[], excludeBookingId?: number) {
  const rows = await prisma.bookingMedicine.findMany({
    where: {
      medicineId: { in: medicineIds },
      drip: { booking: { status: "completed", ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) } },
    },
    select: { medicineId: true, qty: true },
  });
  const all = new Map<number, number>();
  for (const r of rows) all.set(r.medicineId, (all.get(r.medicineId) ?? 0) + Number(r.qty));
  return all;
}

export async function medicineUsages(medicineIds: number[]) {
  const rows = await prisma.bookingMedicine.findMany({
    where: { medicineId: { in: medicineIds }, drip: { booking: { status: { not: "cancelled" } } } },
    select: { medicineId: true, qty: true, drip: { select: { booking: { select: { id: true, taskId: true, status: true } } } } },
    orderBy: { id: "asc" },
  });
  const out = new Map<number, { bookingId: number; taskId: string; qty: number; completed: boolean }[]>();
  for (const r of rows) {
    const list = out.get(r.medicineId) ?? [];
    const b = r.drip.booking;
    const hit = list.find((x) => x.bookingId === b.id);
    if (hit) hit.qty += Number(r.qty);
    else list.push({ bookingId: b.id, taskId: b.taskId, qty: Number(r.qty), completed: b.status === "completed" });
    out.set(r.medicineId, list);
  }
  return out;
}

// Cleans the raw request and checks every vial is one the nurse holds,
// in a total quantity that doesn't exceed what is assigned to them.
export async function validateDrips(
  raw: unknown,
  nurseId: number | null,
  excludeBookingId?: number
): Promise<{ drips: DripInput[] } | { error: string }> {
  if (!Array.isArray(raw) || raw.length === 0) return { drips: [] };
  if (!nurseId) return { error: "Assign a nurse before adding drips" };

  const drips: DripInput[] = [];
  for (const r of raw) {
    const kind = r?.kind === "upsell" ? "upsell" : r?.kind === "cs_drip" ? "cs_drip" : null;
    if (!kind) return { error: "Each drip needs a type" };
    const vials: DripInput["vials"] = [];
    for (const v of Array.isArray(r.vials) ? r.vials : []) {
      const itemId = Number(v?.itemId);
      const qty = Number(v?.qty);
      if (!itemId || !Number.isFinite(qty) || qty <= 0) return { error: "Each vial needs a vial and a quantity" };
      vials.push({ itemId, qty });
    }
    const medicines: DripInput["medicines"] = [];
    for (const m of Array.isArray(r.medicines) ? r.medicines : []) {
      const medicineId = Number(m?.medicineId);
      const qty = Number(m?.qty);
      if (!medicineId || !Number.isFinite(qty) || qty <= 0) return { error: "Each medicine needs a medicine and a quantity" };
      medicines.push({ medicineId, qty });
    }
    drips.push({
      medicines,
      kind,
      dripName: r.dripName ? String(r.dripName).slice(0, 100) : null,
      nss: r.nss ? String(r.nss).slice(0, 50) : null,
      nssQty: r.nss ? Math.max(1, Math.min(99, Math.round(Number(r.nssQty)) || 1)) : 1,
      vials,
    });
  }

  const totals = new Map<number, number>();
  for (const d of drips) for (const v of d.vials) totals.set(v.itemId, (totals.get(v.itemId) ?? 0) + v.qty);

  if (totals.size) {
    const assignments = await prisma.inventoryAssignment.findMany({
      where: { nurseId, itemId: { in: [...totals.keys()] }, item: { isActive: true } },
      include: { item: { select: { name: true, qty: true } } },
    });
    const held = new Map(assignments.map((a) => [a.itemId, a]));
    const usage = await vialUsage([...totals.keys()], excludeBookingId);
    for (const [itemId, total] of totals) {
      const a = held.get(itemId);
      if (!a) return { error: "That vial is not assigned to this nurse" };
      const nurseLeft = Number(a.qty) - (usage.byNurse.get(`${itemId}:${nurseId}`) ?? 0);
      if (total > nurseLeft) return { error: `${a.item.name}: only ${Math.max(0, nurseLeft)} left with this nurse` };
      const poolLeft = Number(a.item.qty) - (usage.all.get(itemId) ?? 0);
      if (total > poolLeft) return { error: `${a.item.name}: only ${Math.max(0, poolLeft)} left in stock` };
    }
  }
  const medTotals = new Map<number, number>();
  for (const d of drips) for (const m of d.medicines) medTotals.set(m.medicineId, (medTotals.get(m.medicineId) ?? 0) + m.qty);
  if (medTotals.size) {
    const meds = await prisma.bulkMedicine.findMany({ where: { id: { in: [...medTotals.keys()] }, isActive: true } });
    const byId = new Map(meds.map((m) => [m.id, m]));
    const used = await medicineUsage([...medTotals.keys()], excludeBookingId);
    for (const [id, total] of medTotals) {
      const m = byId.get(id);
      if (!m) return { error: "Medicine not found" };
      const left = Number(m.qty) - (used.get(id) ?? 0);
      if (total > left) return { error: `${m.name}: only ${Math.max(0, left)} left in bulk stock` };
    }
  }

  return { drips };
}

// Nested create payload for a booking's drips.
export function dripsCreateData(drips: DripInput[]) {
  return drips.map((d) => ({
    kind: d.kind,
    dripName: d.dripName,
    nss: d.nss,
    nssQty: d.nssQty,
    vials: { create: d.vials },
    medicines: { create: d.medicines },
  }));
}
