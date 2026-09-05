import { PrismaClient } from '@prisma/client';

/** Shared Prisma client — import this everywhere, never construct a new one. */
export const prisma = new PrismaClient();
