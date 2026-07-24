// components/ProductGrid.jsx
import ProductCard from './ProductCard'

export default function ProductGrid({ products, pagination }) {
  if (products.length === 0) {
    return (
      <p className="p-8 text-center text-gray-500 flex-1">
        No products match these filters.
      </p>
    )
  }
  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <p className="text-center text-sm text-gray-500 mt-6">
          Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
          results)
        </p>
      )}
    </div>
  )
}
