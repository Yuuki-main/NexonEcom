'use client'

import { useState, useEffect, useCallback } from 'react'
// import banner1 from '../public/nexon_gfx/Homepage_banner.png'
// import banner2 from '../public/nexon_gfx/Power_now_banner.png'
import Homepage_banner1 from './../public/nexon_gfx/HOMEPAGE_PROMOTIONAL_BANNER/1.png'
import Homepage_banner2 from './../public/nexon_gfx/HOMEPAGE_PROMOTIONAL_BANNER/2.png'
import Homepage_banner3 from './../public/nexon_gfx/HOMEPAGE_PROMOTIONAL_BANNER/3.png'
import Homepage_banner4 from './../public/nexon_gfx/HOMEPAGE_PROMOTIONAL_BANNER/4.png'
import Homepage_banner5 from './../public/nexon_gfx/HOMEPAGE_PROMOTIONAL_BANNER/5.png'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { store } from '@/store/store'

const slides = [
  { src: Homepage_banner1, alt: 'Banner 1' },
  { src: Homepage_banner2, alt: 'Banner 2' },
  { src: Homepage_banner3, alt: 'Banner 3' },
  { src: Homepage_banner4, alt: 'Banner 4' },
  { src: Homepage_banner5, alt: 'Banner 5' },
]

export default function HeroBanner() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    const id = setInterval(next, 4000)
    return () => clearInterval(id)
  }, [next])

  return (
    <div className="relative w-full h-[520px] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white cursor-pointer text-xl shadow transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white cursor-pointer text-xl shadow transition-colors"
        aria-label="Next"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  )
}
