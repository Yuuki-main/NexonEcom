'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    image:
      'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1600',
    title: 'UNBEATABLE SOLAR PACKAGES',
    subtitle: 'Shop the best deals this season',
  },
  {
    image:
      'https://images.unsplash.com/photo-1497440001374-f26997328c1b?q=80&w=1600',
    title: 'MADNESS BATTERY PRICES',
    subtitle: 'Major savings on storage solutions',
  },
  {
    image:
      'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?q=80&w=1600',
    title: 'PREMIUM MOUNTING SYSTEMS',
    subtitle: 'Built for Australian conditions',
  },
]

export default function PromoSlider() {
  const [active, setActive] = useState(0)

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setActive((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <div className="relative w-full h-[420px] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-500 ${
            i === active ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={i === 0}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-[28px] sm:text-[40px] md:text-[52px] font-extrabold text-white uppercase tracking-tight leading-tight">
              {slide.title}
            </h2>
            <p className="mt-3 text-[15px] sm:text-[18px] text-white/80 font-medium">
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition cursor-pointer"
        aria-label="Previous slide"
      >
        <ChevronLeft size={22} className="text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition cursor-pointer"
        aria-label="Next slide"
      >
        <ChevronRight size={22} className="text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
              i === active ? 'bg-white' : 'bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
