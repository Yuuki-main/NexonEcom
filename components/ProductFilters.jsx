'use client'
import { useRouter, usePathname } from 'next/navigation'

export default function ProductFilters({ categories, facets, activeParams }) {
  const router = useRouter()
  const pathname = usePathname()

  function toggleValue(key, value) {
    const current = (activeParams[key] || '').split(',').filter(Boolean)
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]

    const params = new URLSearchParams(activeParams)
    if (next.length) params.set(key, next.join(','))
    else params.delete(key)
    params.delete('page') // reset pagination when filters change
    router.push(`${pathname}?${params.toString()}`)
  }

  function isChecked(key, value) {
    return (activeParams[key] || '').split(',').includes(value)
  }

  if (!facets) return null

  return (
    <aside className="w-64 shrink-0 space-y-6">
      <FacetGroup
        title="Wattage"
        items={facets.wattage}
        paramKey="wattage"
        toggleValue={toggleValue}
        isChecked={isChecked}
      />
      <FacetGroup
        title="Cell Type"
        items={facets.cellType}
        paramKey="cellType"
        toggleValue={toggleValue}
        isChecked={isChecked}
      />
      <FacetGroup
        title="Cell Number"
        items={facets.cellNumber}
        paramKey="cellNumber"
        toggleValue={toggleValue}
        isChecked={isChecked}
      />
      <FacetGroup
        title="Technology"
        items={facets.technology}
        paramKey="technology"
        toggleValue={toggleValue}
        isChecked={isChecked}
      />
      <FacetGroup
        title="Frame Color"
        items={facets.frameColor}
        paramKey="frameColor"
        toggleValue={toggleValue}
        isChecked={isChecked}
      />
      <div>
        <h3 className="font-semibold mb-2">Brand</h3>
        {facets.brands.map((b) => (
          <label key={b.slug} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isChecked('brand', b.slug)}
              onChange={() => toggleValue('brand', b.slug)}
            />
            {b.label} ({b.count})
          </label>
        ))}
      </div>
    </aside>
  )
}

function FacetGroup({ title, items, paramKey, toggleValue, isChecked }) {
  if (!items?.length) return null
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {items.map((item) => (
        <label key={item.label} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isChecked(paramKey, item.label)}
            onChange={() => toggleValue(paramKey, item.label)}
          />
          {item.label} ({item.count})
        </label>
      ))}
    </div>
  )
}
