import Image from 'next/image'

const categories = [
  {
    name: 'Refrigerators',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Refrigerator',
  },
  {
    name: 'Washing Machines',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Washer',
  },
  {
    name: 'Dishwashers',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Dishwasher',
  },
  {
    name: 'Kitchen Appliances',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Kitchen',
  },
  {
    name: 'Vacuum Cleaners',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Vacuum',
  },
  {
    name: 'Small Appliances',
    img: 'https://placehold.co/200x200/e5e5e5/999?text=Small+App',
  },
]

export default function AppliancesGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2
        className="text-center mb-10"
        style={{ fontSize: '26px', color: '#333333' }}
      >
        Newest Home Appliances!
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat, i) => (
          <div
            key={cat.name}
            className="group relative bg-[#f5f5f5] rounded-xl p-6 flex flex-col items-center transition-shadow hover:shadow-lg"
          >
            <div className="w-40 h-40 relative mb-4 border-2max- border-blue-500">
              {/* <Image
                src={cat.img}
                alt={cat.name}
                fill
                className="object-contain"
                sizes="160px"
              /> */}
            </div>
            <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
            {/* Hover pill on first card */}
            {i === 0 && (
              <span className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0071ce] text-white text-xs font-medium px-4 py-1.5 rounded-full cursor-pointer">
                Learn More
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
