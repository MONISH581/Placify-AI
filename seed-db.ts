/**
 * Database seed entry point (`npm run seed`, also called during setup/build).
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./server/seed";

dotenv.config({ quiet: true });
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .catch((err) => {
    if (err && typeof err === "object" && "code" in err && err.code === "P2021") {
      console.error("[seed] failed: database schema is missing. Run `npx prisma db push` first.");
    } else {
      console.error("[seed] failed:", err);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
