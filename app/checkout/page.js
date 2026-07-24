import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutClient from '@/components/CheckoutClient'

export default async function CheckoutPage() {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) redirect('/login?redirect=/checkout')

  const cart = await prisma.cart.findFirst({
    where: { userId: payload.userId },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { displayOrder: 'asc' } } } },
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) redirect('/products')

  // Map to the shape CheckoutClient expects (same mappings as Cart API):
  //   product.id        → product._id     (keys)
  //   product.images[]  → product.images  (flatten to string array)
  //   product.price     → Number
  const serializedCart = {
    items: cart.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        _id: item.product.id,
        images: item.product.images.map((img) => img.url),
        price: Number(item.product.price),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <CheckoutClient cart={serializedCart} />
      <Footer />
    </div>
  )
}
