'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CategoryHeroSlider({ items }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const activeItem = items[activeIndex]

  return (
    <section className="relative h-[400px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${activeItem.image})`,
        }}
      />

      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 flex h-full flex-col items-center justify-between text-white px-6 py-[40px]">
        <div className="flex flex-col items-center">
          <h2 className="mb-[26px] text-[26px] font-bold">
            {activeItem.heading}
          </h2>

          <div className="flex flex-wrap justify-center gap-8">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveIndex(index)}
                className={`relative text-[14px] transition-all cursor-pointer ${
                  activeIndex === index
                    ? 'font-semibold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {item.category}

                {activeIndex === index && (
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <h3 className="mb-[14px] text-center text-[26px] font-bold max-w-5xl leading-7">
            {activeItem.title}
          </h3>

          <p className="mb-10 max-w-4xl text-center text-[14px]">
            {activeItem.description}
          </p>

          <Link
            href={activeItem.href || '/products'}
            className="rounded-full bg-blue-500 px-6 py-3 text-[14px] leading-[14px] hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}
