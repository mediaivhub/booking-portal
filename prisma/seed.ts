import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import "dotenv/config";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const NURSES = [
  "Afsana Hussain",
  "Anu Varghese",
  "JALISKA",
  "Kamla Gurjar",
  "MAMATA B",
  "SOWMIYA JOHNSON",
  "SUNI MOLE PS",
];

async function main() {
  console.log("Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const nurseHash = await bcrypt.hash("nurse123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ivhub.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@ivhub.com",
      passwordHash: adminHash,
      role: "admin",
      team: "Management",
      initials: "AD",
    },
  });
  console.log(`Admin: ${admin.email} / admin123`);

  const nurseRecords = [];
  for (const name of NURSES) {
    const email = name.toLowerCase().replace(/\s+/g, ".") + "@ivhub.com";
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);

    const nurse = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        passwordHash: nurseHash,
        role: "nurse",
        team: "Nurses",
        initials,
      },
    });
    nurseRecords.push(nurse);
    console.log(`Nurse: ${nurse.email} / nurse123`);
  }

  const tookanPath = path.resolve(
    __dirname,
    "../../tookan-data.json"
  );

  if (fs.existsSync(tookanPath)) {
    console.log("Importing Tookan bookings...");
    const raw = fs.readFileSync(tookanPath, "utf-8");
    const tookanBookings = JSON.parse(raw);

    let imported = 0;
    for (const b of tookanBookings) {
      const existing = await prisma.booking.findUnique({
        where: { taskId: b.taskId },
      });
      if (existing) continue;

      let client = await prisma.client.findFirst({
        where: {
          name: b.client?.name || "Unknown",
          phone: b.client?.phone || null,
        },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: b.client?.name || "Unknown",
            phone: b.client?.phone || null,
            email: b.client?.email || null,
            address: b.address || null,
          },
        });
      }

      const nurseName = b.nurse?.replace(/\s+/g, " ").trim();
      const nurseRecord = nurseName
        ? nurseRecords.find(
            (n) => n.name.toLowerCase() === nurseName.toLowerCase()
          )
        : null;

      const statusMap: Record<string, string> = {
        Unassigned: "unassigned",
        Assigned: "assigned",
        "On the Way": "ontheway",
        "In Progress": "progress",
        Completed: "completed",
        Cancelled: "cancelled",
        Successful: "completed",
        Started: "progress",
        Accepted: "assigned",
        Declined: "cancelled",
        Failed: "cancelled",
      };

      await prisma.booking.create({
        data: {
          taskId: b.taskId,
          jobId: b.jobId || null,
          orderId: b.orderId || null,
          clientId: client.id,
          nurseId: nurseRecord?.id || null,
          status:
            (statusMap[b.status] as
              | "unassigned"
              | "assigned"
              | "ontheway"
              | "progress"
              | "completed"
              | "cancelled") || "unassigned",
          service: b.service || null,
          address: b.address || null,
          description: b.description || null,
          timeSlot: b.time || null,
          bookingDate: b.date ? new Date(b.date) : null,
          paymentMethod: b.paymentMethod || null,
          trackingLink: b.trackingLink || null,
        },
      });
      imported++;
    }
    console.log(`Imported ${imported} bookings`);
  } else {
    console.log(`No tookan-data.json found at ${tookanPath}, skipping import`);
  }

  const services = await prisma.booking.findMany({
    select: { service: true },
    distinct: ["service"],
    where: { service: { not: null } },
  });

  for (const s of services) {
    if (s.service) {
      await prisma.service.upsert({
        where: { name: s.service },
        update: {},
        create: { name: s.service },
      });
    }
  }
  console.log(`Synced ${services.length} services`);

  console.log("\nDone! Login credentials:");
  console.log("  Admin:  admin@ivhub.com / admin123");
  console.log("  Nurses: [name]@ivhub.com / nurse123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
