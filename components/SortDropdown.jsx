// components/SortDropdown.jsx
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import CustomSelect from '@/components/CustomSelect'

export default function SortDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(val) {
    const params = new URLSearchParams(searchParams)
    if (val) params.set('sort', val)
    else params.delete('sort')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <CustomSelect
      onChange={handleChange}
      value={searchParams.get('sort') || 'newest'}
      options={[
        { value: 'newest', label: 'Newest' },
        { value: 'price-asc', label: 'Price: Low to High' },
        { value: 'price-desc', label: 'Price: High to Low' },
        { value: 'name-asc', label: 'Name: A–Z' },
      ]}
    />
  )
}
