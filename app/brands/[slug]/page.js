import fs from 'node:fs'
import path from 'node:path'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { resolveBrandLogo } from '@/lib/brandLogo'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BrandProducts from '@/components/BrandProducts'

const BRANDS_DIR = path.join(process.cwd(), 'public', 'brands')
const IMAGE_EXT = /\.(png|jpe?g|svg|webp)$/i

export async function generateMetadata({ params }) {
  const { slug } = await params
  const brand = await prisma.brand.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true, description: true },
  })
  if (!brand) return { title: 'Brand Not Found | Nexon' }

  return {
    title: `${brand.name} Products | Nexon`,
    description:
      brand.description ||
      `Browse ${brand.name} products — solar panels, inverters, batteries and more at Nexon Energy.`,
  }
}

export default async function BrandDetailPage({ params }) {
  const { slug } = await params

  const brand = await prisma.brand.findFirst({
    where: { slug, deletedAt: null },
  })
  if (!brand) notFound()

  const logoFiles = fs.existsSync(BRANDS_DIR)
    ? fs.readdirSync(BRANDS_DIR).filter((f) => IMAGE_EXT.test(f))
    : []
  const logoUrl = resolveBrandLogo(brand.name, brand.logoUrl, logoFiles)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-[13px] text-[#999] mb-8 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#00a7a7] transition-colors">
            Home
          </Link>
          <ChevronIcon />
          <Link
            href="/brands"
            className="hover:text-[#00a7a7] transition-colors"
          >
            Brands
          </Link>
          <ChevronIcon />
          <span className="text-[#333] font-medium truncate max-w-[200px]">
            {brand.name}
          </span>
        </nav>

        {/* ── Brand introduction ── */}
        <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10 pb-8">
          {/* Logo */}
          <div className="relative w-full sm:w-[240px] h-[150px] shrink-0 flex items-center justify-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brand.name}
                fill
                className="object-contain"
                sizes="240px"
              />
            ) : (
              <span className="text-[#333] text-xl font-bold">
                {brand.name}
              </span>
            )}
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111]">
              {brand.name}
            </h1>
            {brand.description && (
              <p className="text-[#666] mt-2 text-sm sm:text-base leading-relaxed max-w-3xl">
                {brand.description}
              </p>
            )}
            {brand.website && (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-[13px] text-[#00a7a7] hover:underline"
              >
                Visit official website
                <ExternalIcon />
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#ebebeb]" />

        {/* ── Catalogue (category tabs, filters, grid, pagination) ── */}
        <Suspense
          fallback={
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-[#eee] rounded p-3 animate-pulse"
                >
                  <div className="h-40 bg-[#f4f4f4] rounded mb-3" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-full mb-1" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-2/3 mb-4" />
                  <div className="h-9 bg-[#f0f0f0] rounded" />
                </div>
              ))}
            </div>
          }
        >
          <BrandProducts brandSlug={brand.slug} />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="w-3 h-3 text-[#ccc] shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}
