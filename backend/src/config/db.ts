import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Shared Prisma client.
 *
 * Interactive transactions get a longer budget than Prisma's 5 second default.
 * The database is hosted (Neon), so every statement inside a transaction pays
 * network latency: approving a time off request reads the request, updates it
 * and adjusts the allocation, which measured just under 6 seconds and failed
 * with P2028 "Transaction already closed". Payroll computation does far more
 * work per payslip, so it would have failed the same way.
 *
 * maxWait is how long a transaction may wait to acquire a connection; timeout
 * is how long it may then run.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    transactionOptions: {
      maxWait: 15_000,
      timeout: 60_000,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
