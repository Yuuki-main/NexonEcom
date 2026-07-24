import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getNewsById, newsArticles } from '@/lib/newsData'
import { ChevronLeft } from 'lucide-react'

export function generateStaticParams() {
  return newsArticles.map((a) => ({ id: String(a.id) }))
}

export default async function NewsDetailPage({ params }) {
  const { id } = await params
  const article = getNewsById(id)
  if (!article) notFound()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-[900px] mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/news"
          className="inline-flex items-center gap-1 text-[14px] text-[#666] hover:text-[#00a7a7] transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          Back to News
        </Link>

        {/* Hero image */}
        <div className="relative w-full h-[360px] sm:h-[440px] rounded-xl overflow-hidden mb-10">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Labels */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-bold text-[#00a7a7] uppercase tracking-widest bg-[#eff6ff] px-3 py-1 rounded-full">
            {article.label}
          </span>
          <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wide">
            {article.labelSub}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[32px] sm:text-[38px] font-bold text-[#111] leading-tight tracking-[-0.5px] mb-6">
          {article.title}
        </h1>

        {/* Body */}
        <div className="prose prose-gray max-w-none text-[16px] leading-[28px] text-[#444] space-y-4">
          {article.body.split('\n\n').map((paragraph, i) => {
            const trimmed = paragraph.trim()
            if (!trimmed) return null

            // Bullet points
            if (trimmed.startsWith('•')) {
              return (
                <ul key={i} className="list-none space-y-1 pl-0 my-4">
                  {trimmed.split('\n').map((line, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-[15px] text-[#555]"
                    >
                      <span className="text-[#00a7a7] mt-0.5 shrink-0">•</span>
                      <span>{line.replace(/^•\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              )
            }

            return (
              <p key={i} className="text-[#444]">
                {trimmed}
              </p>
            )
          })}
        </div>
      </main>

      <Footer />
    </div>
  )
}
