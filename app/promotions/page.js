import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import PromoSlider from '@/components/PromoSlider'

const cards = [
  {
    image:
      'https://images.unsplash.com/photo-1548613053-22087dd8edb8?q=80&w=800',
    title: 'Solar Panel Deals',
    subtitle: 'Top brands at unbeatable prices',
  },
  {
    image:
      'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800',
    title: 'Inverter Specials',
    subtitle: 'Hybrid & string inverters on sale',
  },
  {
    image:
      'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?q=80&w=800',
    title: 'Battery Storage',
    subtitle: 'Limited time battery bundles',
  },
]

export default function Promotions() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-[1440px] mx-auto p-8">
        <PromoSlider />

        <section>
          <h2 className="font-bold text-[22px] text-[#111] my-8 text-center">
            Current Promotions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, i) => (
              <div
                key={i}
                className="relative h-[240px] rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <h3 className="text-white font-bold text-[18px]">
                    {card.title}
                  </h3>
                  <p className="text-white/80 text-[13px] mt-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
