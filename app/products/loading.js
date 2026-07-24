export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00a7a7] animate-spin" />
      </div>
    </div>
  )
}
