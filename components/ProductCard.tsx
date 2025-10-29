interface ProductCardProps {
  title: string
  description: string
  icon: string
}

export default function ProductCard({ title, description, icon }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-primary-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed flex-grow">{description}</p>
    </div>
  )
}

