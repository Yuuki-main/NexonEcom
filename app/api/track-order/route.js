import prisma from '@/lib/prisma'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const slip = (searchParams.get('slip') || '').trim()

    if (!slip) {
      return Response.json(
        { error: 'Packing slip number is required' },
        { status: 400 },
      )
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { packingSlipNumber: slip },
          { orderNumber: slip },
        ],
      },
      include: {
        placedBy: {
          select: { fullName: true },
        },
      },
    })

    if (!order) {
      return Response.json(
        { error: 'Order not found' },
        { status: 404 },
      )
    }

    return Response.json({
      order: {
        orderNumber: order.orderNumber,
        packingSlipNumber: order.packingSlipNumber,
        customerName: order.placedBy?.fullName ?? null,
        status: order.status,
        shippingAddress: order.shippingAddressSnapshot ?? null,
        total: Number(order.total),
        placedAt: order.placedAt,
        updatedAt: order.updatedAt,
      },
    })
  } catch (err) {
    console.error('track-order error:', err)
    return Response.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 },
    )
  }
}
