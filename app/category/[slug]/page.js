// app/category/[slug]/page.js
import { redirect } from 'next/navigation'
export default async function CategoryRedirect({ params }) {
  const { slug } = await params
  redirect(`/products?category=${slug}`)
}
