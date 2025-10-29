import { ReactNode } from 'react'

interface SectionProps {
  id: string
  title: string
  children: ReactNode
  className?: string
}

export default function Section({ id, title, children, className = '' }: SectionProps) {
  return (
    <section
      id={id}
      className={`py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

