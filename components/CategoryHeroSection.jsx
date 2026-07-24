import React from 'react'
import CategoryHeroSlider from '@/components/CategoryHeroSlider'

const categories1 = [
  { id: 1, category: 'N-Type', heading: 'Solar Panels', href: '/products?category=solar-panels', title: 'High Efficiency N-Type Solar Panels', description: 'Engineered for superior energy yield, lower degradation and exceptional long-term performance for residential and commercial projects.', image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2000' },
  { id: 2, category: 'TOPCon', heading: 'Solar Panels', href: '/products?category=solar-panels', title: 'TOPCon Solar Panels', description: 'Advanced TOPCon technology delivering higher efficiency, improved temperature performance and reliable power generation.', image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=2000' },
  { id: 3, category: 'Mono PERC', heading: 'Solar Panels', href: '/products?category=solar-panels', title: 'Mono PERC Solar Panels', description: 'Cost-effective, durable and trusted by installers worldwide for a wide range of solar installations.', image: 'https://images.unsplash.com/photo-1548613053-22087dd8edb8?q=80&w=2000' },
  { id: 4, category: 'Bifacial', heading: 'Solar Panels', href: '/products?category=solar-panels', title: 'Bifacial Solar Panels', description: 'Capture sunlight from both sides to maximize output and improve overall system efficiency.', image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?q=80&w=2000' },
]

const categories2 = [
  { id: 1, category: 'Hybrid', heading: 'Inverters', href: '/products?category=inverters', title: 'Hybrid Solar Inverters', description: 'Seamlessly combine solar generation, battery storage and grid power for maximum flexibility and energy independence.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2000' },
  { id: 2, category: 'String', heading: 'Inverters', href: '/products?category=inverters', title: 'String Inverters', description: 'Reliable and scalable solutions for residential and commercial solar systems.', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2000' },
  { id: 3, category: 'Micro', heading: 'Inverters', href: '/products?category=inverters', title: 'Micro Inverters', description: 'Optimize every panel individually for enhanced safety and superior energy harvest.', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2000' },
  { id: 4, category: 'Three Phase', heading: 'Inverters', href: '/products?category=inverters', title: 'Three Phase Inverters', description: 'Powerful and efficient inverters designed for larger homes and commercial installations.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2000' },
]

const categories3 = [
  { id: 1, category: 'Residential', heading: 'Battery Storage', href: '/products?category=battery-storage', title: 'Residential Battery Storage', description: 'Store excess solar energy and use it whenever you need with safe and intelligent battery systems.', image: 'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?q=80&w=2000' },
  { id: 2, category: 'Commercial', heading: 'Battery Storage', href: '/products?category=battery-storage', title: 'Commercial Energy Storage', description: 'Scalable storage solutions engineered to reduce energy costs and improve grid independence.', image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2000' },
  { id: 3, category: 'All-in-One', heading: 'Battery Storage', href: '/products?category=battery-storage', title: 'All-in-One Storage Systems', description: 'Compact systems combining inverter and battery technology into one seamless energy solution.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2000' },
]

const categories4 = [
  { id: 1, category: 'Roof Mount', heading: 'Mounting Systems', href: '/products?category=mounting-systems', title: 'Roof Mounting Systems', description: 'Durable and easy-to-install mounting structures designed for residential rooftops.', image: 'https://images.unsplash.com/photo-1624397640148-949b1732bb0a?q=80&w=2000' },
  { id: 2, category: 'Ground Mount', heading: 'Mounting Systems', href: '/products?category=mounting-systems', title: 'Ground Mount Systems', description: 'Robust ground mounting solutions for commercial and utility-scale solar projects.', image: 'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?q=80&w=2000' },
  { id: 3, category: 'Carport', heading: 'Mounting Systems', href: '/products?category=mounting-systems', title: 'Solar Carport Structures', description: 'Innovative solar carport systems combining vehicle protection with clean energy generation.', image: 'https://images.unsplash.com/photo-1624397640148-949b1732bb0a?q=80&w=2000' },
]

const CategoryHeroSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <CategoryHeroSlider items={categories1} />
      <CategoryHeroSlider items={categories2} />
      <CategoryHeroSlider items={categories3} />
      <CategoryHeroSlider items={categories4} />
    </div>
  )
}

export default CategoryHeroSection
