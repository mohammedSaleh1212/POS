import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// FIX 3: Import strictly from your custom generated folder
import { PrismaClient } from '../generated/prisma'; 

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('FATAL: DATABASE_URL is undefined in .env');
}

// FIX 4: Create a pg Pool, then pass it to the Prisma adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

declare global {
  var globalPrisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}