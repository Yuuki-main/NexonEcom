import prisma from '@/lib/prisma'

export async function GET() {
  // A cheap query that exercises the connection pool — equivalent to the
  // old `await connectDB()` followed by an implicit ping.
  // `$queryRaw` runs a raw SQL SELECT that returns instantly if the pool
  // is healthy; throws if the database is unreachable.
  await prisma.$queryRaw`SELECT 1`
  return Response.json({ status: 'ok', db: 'connected' })
}
