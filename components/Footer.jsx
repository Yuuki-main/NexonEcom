import Link from 'next/link'
import Image from 'next/image'

const productLinks = [
  { label: 'Solar Panels', href: '/products?category=solar-panels' },
  { label: 'Inverters', href: '/products?category=inverters' },
  { label: 'Battery Storage', href: '/products?category=battery-storage' },
  { label: 'Mounting Systems', href: '/products?category=mounting-systems' },
  { label: 'Heat Pumps', href: '/products?category=heat-pumps' },
  { label: 'All Products', href: '/products' },
  { label: 'Promotions', href: '/promotions' },
]

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'News', href: '/news' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Downloads', href: '/downloads' },
  { label: 'Calculator', href: '/calculator' },
]

const supportLinks = [
  { label: 'Track Order', href: '/track-order' },
  { label: 'My Account', href: '/account' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Cookie Policy', href: '#' },
]

const trustedBrands = [
  'Jinko Solar',
  'LONGi',
  'Sungrow',
  'FoxESS',
  'Canadian Solar',
  'Trina Solar',
]

const socialLinks = [
  { label: 'Instagram', href: '#', icon: '/icons/instagram_ic.png' },
  { label: 'Facebook', href: '#', icon: '/icons/facebook_ic.png' },
  { label: 'YouTube', href: '#', icon: '/icons/youtube.png' },
]

export default function Footer() {
  return (
    <footer style={{ background: '#07141d' }}>
      {/* Main grid */}
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 — Products */}
          <div>
            <h3 className="text-[14px] font-bold text-white mb-4 tracking-wide uppercase">
              Products
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/65 hover:text-[#00a7a7] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 — Company */}
          <div>
            <h3 className="text-[14px] font-bold text-white mb-4 tracking-wide uppercase">
              Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/65 hover:text-[#00a7a7] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Support */}
          <div>
            <h3 className="text-[14px] font-bold text-white mb-4 tracking-wide uppercase">
              Support
            </h3>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/65 hover:text-[#00a7a7] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Brands & Social */}
          <div>
            <h3 className="text-[14px] font-bold text-white mb-4 tracking-wide uppercase">
              Trusted Brands
            </h3>
            <ul className="space-y-2">
              {trustedBrands.map((brand) => (
                <li key={brand}>
                  <span className="text-[13px] text-white/50">{brand}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-[14px] font-bold text-white mt-7 mb-3 tracking-wide uppercase">
              Follow Us
            </h3>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="opacity-70 hover:opacity-100 transition-opacity bg-white p-1 rounded-md"
                >
                  <Image
                    src={social.icon}
                    alt={social.label}
                    width={22}
                    height={22}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Bottom bar */}
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] text-white/50">
          &copy; 2026 Nexon Energy Distribution. All rights reserved.
        </span>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-white/50">
          <Link href="#" className="hover:text-[#00a7a7] transition-colors">
            Privacy Policy
          </Link>
          <span className="text-white/20">|</span>
          <Link href="#" className="hover:text-[#00a7a7] transition-colors">
            Terms of Service
          </Link>
          <span className="text-white/20">|</span>
          <Link href="#" className="hover:text-[#00a7a7] transition-colors">
            Cookie Policy
          </Link>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1.5">
            <span>&#x1f1e6;&#x1f1fa;</span>
            Australia
          </span>
        </div>
      </div>

      {/* Powered by bar — full-width, below all footer content */}
      <div className="bg-[#07141D] py-3.5 w-full flex items-center justify-center">
        <span className="text-[#848a8e] font-medium text-[14px] sm:text-[16px]">
          Powered by Crestwave Digital Pty Ltd
        </span>
      </div>
    </footer>
  )
}
