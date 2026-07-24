import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Global singleton — reuse a single PrismaClient instance across hot reloads.
// Prisma v7+ requires a driver adapter; it no longer reads DATABASE_URL directly.
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })

const globalForPrisma = /** @type {typeof globalThis & { _prisma?: PrismaClient }} */ (globalThis)

const prisma = globalForPrisma._prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma._prisma = prisma
}

export { prisma }
export default prisma
