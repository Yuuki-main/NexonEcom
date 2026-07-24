import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Headphones,
  Users,
  Truck,
  Send,
} from 'lucide-react'

const branches = [
  {
    city: 'Albury NSW',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800',
    address: 'U 2 575 Olive St Albury NSW',
    phone: '1300 870 902',
    email: 'sydney@nexon.com.au',
    hours: 'Mon - Fri 9:00am - 5:30pm',
    // pickup: 'Warehouse Pickup Available',
  },
  // {
  //   city: 'Sydney',
  //   image:
  //     'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800',
  //   address: '52 Quarry Rd, Erskine Park NSW 2759',
  //   phone: '1300 870 902',
  //   email: 'sydney@nexon.com.au',
  //   hours: 'Mon - Fri 9:00am - 5:30pm',
  //   pickup: 'Warehouse Pickup Available',
  // },
  // {
  //   city: 'Melbourne',
  //   image:
  //     'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=80&w=800',
  //   address: '140 Colemans Rd, Dandenong South VIC 3175',
  //   phone: '1300 870 902',
  //   email: 'melbourne@nexon.com.au',
  //   hours: 'Mon - Fri 9:00am - 5:30pm',
  //   pickup: 'Warehouse Pickup Available',
  // },
  // {
  //   city: 'Brisbane',
  //   image:
  //     'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800',
  //   address: '55 Rai Dr, Crestmead QLD 4132',
  //   phone: '1300 870 902',
  //   email: 'brisbane@nexon.com.au',
  //   hours: 'Mon - Fri 9:00am - 5:30pm',
  //   pickup: 'Warehouse Pickup Available',
  // },
]

const features = [
  {
    icon: Headphones,
    title: 'Fast Support',
    description:
      'Our dedicated support team responds within hours, not days. We understand that installers need answers quickly to keep projects on schedule.',
  },
  {
    icon: Users,
    title: 'Expert Technical Team',
    description:
      'Our team includes qualified engineers and solar specialists who can assist with system design, product selection and technical specifications.',
  },
  {
    icon: Truck,
    title: 'Australia Wide Distribution',
    description:
      'With warehouses in Sydney, Melbourne and Brisbane, we provide fast delivery and local pickup options for installers across the country.',
  },
]

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── SECTION 1: Breadcrumb ── */}
      <div className="bg-[#f7f8fa] border-b border-[#e8eaed]">
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <nav className="flex items-center gap-1.5 text-[13px] text-[#666]">
            <Link href="/" className="hover:text-[#00a7a7] transition-colors">
              Home
            </Link>
            <ChevronRight size={14} className="text-[#bbb]" />
            <span className="text-[#333] font-medium">Contact Us</span>
          </nav>
        </div>
      </div>

      {/* ── SECTION 2: Hero ── */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <h1 className="text-[36px] md:text-[44px] font-bold text-[#111] tracking-[-0.5px] leading-tight">
            How can we help you?
          </h1>
          <p className="mt-6 text-[16px] text-[#555] leading-[28px] max-w-[760px] mx-auto">
            Nexon is committed to providing installers, contractors, and
            businesses with reliable solar and energy storage solutions. Whether
            you need product information, technical support, or want to discuss
            a project, our team is here to help.
          </p>
          <p className="mt-4 text-[16px] text-[#555] leading-[28px] max-w-[760px] mx-auto">
            With three warehouses across Australia and a dedicated team of solar
            specialists, we make it easy to get the products and support you
            need — when you need them.
          </p>
        </div>
      </section>

      {/* ── SECTION 3: Branch Locations ── */}
      <section className="bg-[#f7f8fa] py-16 md:py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[28px] md:text-[34px] font-bold text-[#111] text-center tracking-[-0.5px] mb-12">
            Our Locations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.city}
                className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Warehouse image */}
                <div className="relative h-[220px] overflow-hidden">
                  <Image
                    src={branch.image}
                    alt={`${branch.city} warehouse`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/15" />
                </div>

                {/* Details */}
                <div className="p-6">
                  <h3 className="text-[20px] font-bold text-[#07141d] uppercase tracking-wide mb-4">
                    {branch.city}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin
                        size={17}
                        className="text-[#00a7a7] shrink-0 mt-0.5"
                      />
                      <span className="text-[14px] text-[#444] leading-[22px]">
                        {branch.address}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone size={17} className="text-[#00a7a7] shrink-0" />
                      <a
                        href={`tel:${branch.phone.replace(/\s/g, '')}`}
                        className="text-[14px] text-[#444] hover:text-[#00a7a7] transition-colors"
                      >
                        {branch.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail size={17} className="text-[#00a7a7] shrink-0" />
                      <a
                        href={`mailto:${branch.email}`}
                        className="text-[14px] text-[#00a7a7] hover:underline transition-colors"
                      >
                        {branch.email}
                      </a>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock
                        size={17}
                        className="text-[#00a7a7] shrink-0 mt-0.5"
                      />
                      <span className="text-[14px] text-[#444]">
                        {branch.hours}
                      </span>
                    </div>

                    {/* <div className="flex items-center gap-3">
                      <Building2
                        size={17}
                        className="text-[#00a7a7] shrink-0"
                      />
                      <span className="text-[14px] font-medium text-[#16a34a]">
                        {branch.pickup}
                      </span>
                    </div> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Contact Form + Map ── */}
      <section id="send-message" className="py-16 md:py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[28px] md:text-[34px] font-bold text-[#111] text-center tracking-[-0.5px] mb-12">
            Send Us a Message
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: Form */}
            <div>
              <form className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                      Full Name <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                      Company Name <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors"
                      placeholder="Your Company Pty Ltd"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                      Email <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors"
                      placeholder="john@company.com.au"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors"
                      placeholder="04XX XXX XXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                    Subject <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors"
                    placeholder="Product enquiry / Technical support / General"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                    Message <span className="text-[#ef4444]">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] placeholder-[#aaa] focus:outline-none focus:border-[#00a7a7] bg-white transition-colors resize-none"
                    placeholder="Tell us about your project or enquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#00a7a7] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Send size={17} />
                  Send Message
                </button>
              </form>
            </div>

            {/* Right: Google Maps embed */}
            <div className="flex flex-col">
              <div className="relative flex-1 min-h-[440px] rounded-xl overflow-hidden border border-[#e8eaed]">
                <iframe
                  src="https://www.google.com/maps?q=Unit%202%2C%20575%20Olive%20Street%2C%20Albury%20NSW%2C%20Australia&output=embed"
                  title="Nexon Albury location map"
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />

                {/* Address overlay */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-gray-700 font-medium">
                    Unit 2, 575 Olive Street, Albury NSW
                  </p>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Unit%202%2C%20575%20Olive%20Street%2C%20Albury%20NSW%2C%20Australia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold text-[#00a7a7] hover:text-[#1d4ed8] transition-colors whitespace-nowrap"
                  >
                    Get Directions
                  </a>
                </div>
              </div>

              {/* Contact info summary */}
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-[#f7f8fa] rounded-lg p-4 text-center">
                  <Phone size={20} className="mx-auto text-[#00a7a7] mb-2" />
                  <p className="text-[13px] font-medium text-[#333]">
                    1300 870 902
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    Sales &amp; Support
                  </p>
                </div>
                <div className="bg-[#f7f8fa] rounded-lg p-4 text-center">
                  <Mail size={20} className="mx-auto text-[#00a7a7] mb-2" />
                  <p className="text-[13px] font-medium text-[#333]">
                    sales@nexon.com.au
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    General Enquiries
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Why Contact Nexon ── */}
      <section className="bg-[#f7f8fa] py-16 md:py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[28px] md:text-[34px] font-bold text-[#111] text-center tracking-[-0.5px] mb-12">
            Why Contact Nexon
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-xl border border-[#e8eaed] p-8 text-center hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                  <Icon size={26} className="text-[#00a7a7]" />
                </div>
                <h3 className="text-[17px] font-bold text-[#111] mb-3">
                  {title}
                </h3>
                <p className="text-[14px] text-[#555] leading-[24px]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: CTA ── */}
      <section className="py-20 px-6" style={{ background: '#07141d' }}>
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[30px] md:text-[38px] font-bold text-white tracking-[-0.5px] leading-tight">
            Need Help With Your Next Solar Project?
          </h2>
          <p className="mt-4 text-[16px] text-[#a8c4e8] leading-[26px]">
            Our team is ready to help. Whether you need pricing, technical
            specs, or project advice — reach out and we will get back to you
            fast.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <a
              href="#send-message"
              className="inline-flex items-center gap-2 bg-[#00a7a7] hover:bg-[#168482] text-[#07141d] font-bold text-[15px] px-8 py-3.5 rounded-lg transition-colors cursor-pointer"
            >
              <Send size={17} />
              Get a Quote
            </a>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-colors cursor-pointer"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
