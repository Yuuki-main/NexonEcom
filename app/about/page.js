import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import AboutUsBanner from './../../public/nexon_gfx/About_us_banner.png'

const coreValues = [
  {
    id: 1,
    title: 'Integrity',
    icon: (
      <svg width="90" height="80" viewBox="0 0 90 80" fill="none">
        {/* back speech bubble green */}
        <rect x="30" y="8" width="46" height="36" rx="4" fill="#4caf50" />
        <polygon points="58,44 50,56 66,44" fill="#4caf50" />
        {/* front speech bubble blue */}
        <rect x="14" y="18" width="46" height="36" rx="4" fill="#1565c0" />
        <polygon points="28,54 20,66 36,54" fill="#1565c0" />
        {/* eye white */}
        <ellipse cx="37" cy="36" rx="12" ry="9" fill="white" />
        {/* pupil */}
        <circle cx="37" cy="36" r="5" fill="#111" />
        <circle cx="39" cy="34" r="1.5" fill="white" />
      </svg>
    ),
    paragraphs: [
      'Success requires discipline and a commitment to always prioritize sustainability and long-term outlook over short-term wins.',
      'When we operate from a place of integrity, we hold ourselves accountable to produce honest, excellent work no matter what the occasion is or who is watching – doing what is right and delivering what we promise.',
    ],
  },
  {
    id: 2,
    title: 'Be Customer-Driven',
    icon: (
      <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        {/* stars */}
        <text x="18" y="22" fontSize="18" fill="#FFC107">
          ★
        </text>
        <text x="40" y="14" fontSize="20" fill="#FFC107">
          ★
        </text>
        <text x="62" y="20" fontSize="18" fill="#FFC107">
          ★
        </text>
        {/* left hand dark */}
        <path
          d="M10 70 Q10 48 28 46 L44 46 Q50 46 50 52 L50 70 Z"
          fill="#333"
        />
        {/* right hand grey */}
        <path
          d="M90 70 Q90 48 72 46 L56 46 Q50 46 50 52 L50 70 Z"
          fill="#888"
        />
        {/* handshake green */}
        <path
          d="M28 58 Q50 44 72 58"
          stroke="#43a047"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="50" cy="58" rx="14" ry="8" fill="#43a047" />
      </svg>
    ),
    paragraphs: [
      'Happy customers have always been our greatest rewards.',
      "Being familiar with our customers' needs and knowing how we can meet them through our products and service will always be the foundation of our business and customer relationships.",
    ],
  },
  {
    id: 3,
    title: 'Be Innovative',
    icon: (
      <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
        {/* bulb yellow */}
        <circle cx="40" cy="30" r="22" fill="#FDD835" />
        {/* bolt */}
        <polygon points="44,16 34,32 42,32 36,46 48,28 40,28" fill="#1565c0" />
        {/* base */}
        <rect x="32" y="52" width="16" height="5" rx="2" fill="#555" />
        <rect x="34" y="57" width="12" height="4" rx="2" fill="#555" />
        {/* leaves */}
        <path
          d="M20 72 Q24 56 40 62"
          stroke="#43a047"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="20"
          cy="74"
          rx="10"
          ry="7"
          fill="#43a047"
          transform="rotate(-20 20 74)"
        />
        <path
          d="M60 72 Q56 56 40 62"
          stroke="#43a047"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="60"
          cy="74"
          rx="10"
          ry="7"
          fill="#66bb6a"
          transform="rotate(20 60 74)"
        />
        {/* stem */}
        <line x1="40" y1="61" x2="40" y2="74" stroke="#555" strokeWidth="3" />
      </svg>
    ),
    paragraphs: [
      'Some innovations spring from a flash of genius, but mostly, innovation is real work.',
      'Better half full or half empty? We compromise at three-quarters, so we have room for innovation opportunities and paradigm shifts.',
    ],
  },
  {
    id: 4,
    title: 'Be One',
    icon: (
      <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
        {/* left blue hand raised */}
        <path
          d="M16 80 L16 40 Q16 30 26 30 L36 30 Q40 30 40 36 L40 80 Z"
          fill="#1565c0"
        />
        <path d="M16 50 Q8 44 10 36 Q12 28 20 30" fill="#1565c0" />
        {/* right green hand raised */}
        <path
          d="M74 80 L74 40 Q74 30 64 30 L54 30 Q50 30 50 36 L50 80 Z"
          fill="#43a047"
        />
        <path d="M74 50 Q82 44 80 36 Q78 28 70 30" fill="#43a047" />
        {/* fingers blue */}
        <rect x="20" y="20" width="8" height="20" rx="4" fill="#1976d2" />
        <rect x="28" y="16" width="8" height="22" rx="4" fill="#1976d2" />
        <rect x="36" y="18" width="6" height="20" rx="3" fill="#1976d2" />
        {/* fingers green */}
        <rect x="62" y="20" width="8" height="20" rx="4" fill="#43a047" />
        <rect x="54" y="16" width="8" height="22" rx="4" fill="#43a047" />
        <rect x="48" y="18" width="6" height="20" rx="3" fill="#66bb6a" />
        {/* hi-five lines */}
        <line x1="44" y1="10" x2="46" y2="4" stroke="#333" strokeWidth="2" />
        <line x1="40" y1="8" x2="38" y2="2" stroke="#333" strokeWidth="2" />
        <line x1="48" y1="8" x2="50" y2="2" stroke="#333" strokeWidth="2" />
      </svg>
    ),
    paragraphs: [
      'In a competitive landscape, we believe in the power of a collective supply-chain ecosystem – a collaborative network between suppliers, manufacturers, distributors, retailers, installers and customers.',
      'Embracing collaboration, we synergise as one to create value, leverage resources and expertise, foster innovation, encourage exchange of ideas and technologies to unlock exciting new opportunities and to ensure success and resilience of the entire supply chain.',
    ],
  },
]

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* ── Section 1: One Simple Way ── */}
        <section className="max-w-[960px] mx-auto px-6 pt-20 pb-12 text-center grid grid-cols-1 gap-y-8">
          <h1 className="text-4xl md:text-5xl text-center font-bold">
            One Simple Way
          </h1>
          <p className="text-[#1c2128] leading-[32px] max-w-[920px] mx-auto">
            Dedicated to keeping the transition to sustainable energy simple.
            Promoting environmental, social and economic sustainability through
            intelligent and innovative renewable energy technologies.
          </p>

          <div className="space-y-6 text-[#1c2128]">
            <p>
              <span className="font-bold">Mission:</span> Simplify the
              sustainable energy transition
            </p>
            <p>
              <span className="font-bold">Vision:</span> Be a leading innovator
              in one-stop solutions for the global energy transition
            </p>
          </div>

          {/* Image with green arc overlay */}
          <div className="relative overflow-hidden w-full h-[245px]">
            <Image
              src={AboutUsBanner}
              alt="Solar panel worker"
              fill
              className="object-cover object-center"
            />
            {/* Green arc SVG overlay */}
            {/* <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="340" height="340" viewBox="0 0 340 340" fill="none">
                <path
                  d="M60 280 A170 170 0 0 1 280 280"
                  stroke="url(#arcGrad)"
                  strokeWidth="60"
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00e5a0" />
                    <stop offset="100%" stopColor="#00bcd4" />
                  </linearGradient>
                </defs>
              </svg>
            </div> */}
          </div>
        </section>

        {/* ── Section 2: Our Core Values ── */}
        <section className="max-w-[1200px] mx-auto px-6 pb-20">
          <h2 className="text-4xl md:text-5xl text-center font-bold">
            Our Core Values
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-20 mt-12">
            {coreValues.map((val) => (
              <div key={val.id}>
                {/* Icon */}
                <div className="flex justify-center mb-4">{val.icon}</div>
                {/* Title */}
                <h3 className="text-[24px] font-extrabold text-[#1c2128] text-center mb-5">
                  {val.title}
                </h3>
                {/* Paragraphs */}
                <div className="space-y-4">
                  {val.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-[14px] text-[#1c2128] leading-[26px]"
                    >
                      {p}
                    </p>
                  ))}
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
