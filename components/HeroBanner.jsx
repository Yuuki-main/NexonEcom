'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SLIDE_COUNT = 5

const slides = Array.from({ length: SLIDE_COUNT }, (_, i) => ({
  src1024: `/home_page/Nexon_1024x520/${i + 1}.png`,
  src1440: `/home_page/Nexon_1440x520/${i + 1}.png`,
  alt: `Banner ${i + 1}`,
}))

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
    <div className="relative w-full aspect-[1024/520] min-[1025px]:aspect-[1440/520] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <picture className="absolute inset-0">
            <source
              srcSet={slide.src1440}
              media="(min-width: 1025px)"
            />
            <Image
              src={slide.src1024}
              alt={slide.alt}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </picture>
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
