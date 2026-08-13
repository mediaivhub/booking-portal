import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient>;
};

function createPrismaClient() {
  const adapter = new PrismaMariaDb(
    {
      host: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      database: process.env.DB_NAME!,
    },
    // The default binary protocol (prepared statements) binds string params
    // with no explicit collation, which MariaDB treats as utf8mb4_bin. That
    // trips error 1267 ("Illegal mix of collations") against this database's
    // utf8mb4_unicode_ci columns in a LIKE. The text protocol sends queries
    // as plain SQL with the connection's charset/collation instead.
    { useTextProtocol: true }
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
