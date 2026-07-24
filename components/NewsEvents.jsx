'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronRight, Headphones, ClipboardPlus } from 'lucide-react'
import { newsArticles } from '@/lib/newsData'

export default function NewsEvents() {
  const [active, setActive] = useState(0)
  const current = newsArticles[active]

  return (
    <section className="bg-white py-16 px-6 lg:px-12">
      <div className="max-w-[1200px] mx-auto">
        {/* Heading */}
        <h2 className="text-[38px] font-bold text-[#111] text-center tracking-[-0.5px] mb-10">
          News / Events
        </h2>

        {/* Main card */}
        <div className="flex flex-col md:flex-row gap-0 rounded-xl overflow-hidden border border-[#e8e8e8]">
          {/* Left: image */}
          <div className="relative w-full md:w-[52%] h-[360px] md:h-auto shrink-0">
            <Image
              src={current?.image}
              alt={current.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Right: text */}
          <div className="flex-1 bg-[#f7f7f7] px-16 py-4 flex flex-col gap-3 justify-center min-h-[364px]">
            <h3 className="text-[32px] font-semibold text-[#333] leading-snug">
              {current.title}
            </h3>
            <p className="text-[16px] text-[#555] leading-[26px]">
              {current.description}
            </p>
            <Link
              href={`/news/${current.id}`}
              className="flex items-center gap-1 text-[#2196f3] text-[15px] hover:underline w-fit"
            >
              Learn More <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Dots / pagination */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {newsArticles.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-[3px] rounded-full transition-all cursor-pointer ${
                i === active ? 'w-10 bg-[#2196f3]' : 'w-8 bg-[#d0d0d0]'
              }`}
            />
          ))}
        </div>

        {/* Support row */}
        <div className="mt-16 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#e0e0e0] overflow-hidden">
          {/* Customer Support */}
          <div className="flex-1 flex flex-col items-center text-center px-10 py-12">
            <Headphones size={52} strokeWidth={1.8} color="#5a6a8a" />
            <h4 className="mt-5 text-[17px] font-bold text-[#111]">
              Customer Support
            </h4>
            <p className="mt-1.5 text-[13px] text-[#666]  max-w-[285px]">
              Do you have questions about your NexonEcom product? NexonEcom
              Customer Service is here to help!
            </p>
            <Link href="/contact" className="mt-4 border border-[#bbb] rounded-full px-6 py-2.5 text-[14px] font-medium text-[#111] hover:bg-gray-100 transition cursor-pointer">
              Get Help
            </Link>
          </div>

          {/* Register a Product */}
          <div className="flex-1 flex flex-col items-center text-center px-10 py-12">
            <ClipboardPlus size={52} strokeWidth={1.8} color="#5a6a8a" />
            <h4 className="mt-5 text-[17px] font-bold text-[#111]">
              Register a Product
            </h4>
            <p className="mt-1.5 text-[13px] text-[#666]  max-w-[285px]">
              Get the most out of your product by taking a minute to register.
            </p>
            <Link href="/contact" className="mt-4 border border-[#bbb] rounded-full px-6 py-2.5 text-[14px] font-medium text-[#111] hover:bg-gray-100 transition cursor-pointer">
              Register Your Product
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
