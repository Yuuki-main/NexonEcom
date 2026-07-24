'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { normalizeName, LOGO_OVERRIDES, fileToBrandKey } from '@/lib/brandLogo'

const CATEGORY_BRANDS = {
  Panels: [
    'AE Solar',
    'Canadian Solar',
    'Eging PV',
    'JA Solar',
    'Jinko Solar',
    'Risen Energy',
    'Sungrow',
    'Trina Solar',
    'LONGi',
    'Suntech',
    'Tindo Solar',
  ],
  Inverters: [
    'AlphaESS',
    'Anker Solix',
    'Dyness',
    'FoxESS',
    'GoodWe',
    'SAJ',
    'SolarEdge',
    'Solis',
    'Solplanet',
    'Sungrow',
    'GE',
    'Fronius',
    'KSTAR',
  ],
  Storage: [
    'AlphaESS',
    'Anker Solix',
    'Dyness',
    'FoxESS',
    'GoodWe',
    'LG Energy Solution',
    'SAJ',
    'SolarEdge',
    'Solis',
    'Sungrow',
    'KSTAR',
  ],
  Mountings: ['Antai', 'Titan Solar'],
  'EV Chargers': ['Anker Solix', 'FoxESS', 'GoodWe', 'SolarEdge'],
  'Heat Pump': ['Emerald'],
  Electricals: [
    'ASE Technology',
    'NHP',
    'Greenbox',
    'Tigo',
    'ZBENY',
    'TMAC',
    'Other',
  ],
}

function SectionHeader({ category }) {
  return (
    <div className="relative flex items-center my-10">
      <div className="flex-grow border-t border-[#e8e8e8]" />
      <span className="mx-4 text-[13px] font-bold text-[#555] uppercase tracking-widest">
        {category}
      </span>
      <div className="flex-grow border-t border-[#e8e8e8]" />
    </div>
  )
}

function BrandCard({ brand, logoUrl, slug }) {
  const content = (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-6 h-[100px] flex items-center justify-center hover:border-[#00a7a7] hover:shadow-sm transition-all duration-300">
      {logoUrl ? (
        <div className="relative w-full h-full">
          <Image
            src={logoUrl}
            alt={brand}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      ) : (
        <span className="bg-[#f5f5f5] rounded text-[#444] font-medium text-sm px-4 py-1.5">
          {brand}
        </span>
      )}
    </div>
  )

  return slug ? <Link href={`/brands/${slug}`}>{content}</Link> : content
}

export default function BrandPartners({ showGrouped = false }) {
  const [brands, setBrands] = useState([])
  const [logoFiles, setLogoFiles] = useState([])

  useEffect(() => {
    async function load() {
      const [brandsRes, logosRes] = await Promise.all([
        fetch('/api/brands'),
        fetch('/api/brand-logos'),
      ])
      const brandsData = await brandsRes.json()
      const logosData = await logosRes.json()
      setBrands(brandsData.brands || [])
      setLogoFiles(logosData.files || [])
    }
    load()
  }, [])

  // Build a lookup: normalized brand name → logoUrl from API data
  const logoLookup = {}
  const slugLookup = {}
  brands.forEach((b) => {
    logoLookup[normalizeName(b.name)] = b.logoUrl
    slugLookup[normalizeName(b.name)] = b.slug
  })

  // Build a lookup: normalized brand name → logoUrl from files in
  // /public/brands, so any new logo dropped there is picked up automatically.
  const fileLookup = {}
  logoFiles.forEach((filename) => {
    fileLookup[fileToBrandKey(filename)] = `/brands/${filename}`
  })

  // ── Grouped layout ──
  if (showGrouped) {
    return (
      <section className="pb-16 lg:pb-20 bg-white ">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-gray-500 max-w-lg mx-auto">Our Brand Partners</p>
          </div>

          {Object.entries(CATEGORY_BRANDS).map(([category, brandNames]) => (
            <div key={category}>
              <SectionHeader category={category} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {brandNames.map((name) => (
                  <BrandCard
                    key={name}
                    brand={name}
                    slug={slugLookup[normalizeName(name)]}
                    logoUrl={
                      LOGO_OVERRIDES[normalizeName(name)] ||
                      fileLookup[normalizeName(name)] ||
                      logoLookup[normalizeName(name)] ||
                      null
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // ── Flat grid layout (existing, with next/image) ──
  return (
    <section className="py-16 lg:py-20 bg-white border-t border-green-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-4"
        >
          <p className="mt-3 text-gray-500 max-w-lg mx-auto">Featured Brands</p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6">
          {brands.map((brand, i) => {
            const logoUrl =
              LOGO_OVERRIDES[normalizeName(brand.name)] ||
              fileLookup[normalizeName(brand.name)] ||
              brand.logoUrl ||
              null
            return (
              <motion.div
                key={brand._id || brand.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group"
              >
                <Link href={`/brands/${brand.slug}`}>
                  <div className="aspect-[3/2] rounded-xl flex items-center justify-center p-4 hover:border-blue-400 hover:shadow-sm transition-all duration-300">
                    {logoUrl ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={logoUrl}
                          alt={brand.name}
                          fill
                          className="object-contain transition-all duration-300"
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">
                        {brand.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2 group-hover:text-gray-600 transition-colors">
                    {brand.name}
                  </p>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
