import { PrismaClient } from '@prisma/client'

/**
 * A single Prisma instance per process. Next.js hot-reloads modules in dev,
 * which would otherwise open a new connection pool on every save.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
