import Link from 'next/link'
import Footer from '@/components/Footer'
import ImageEditor from '@/components/ImageEditor'
import GifEditor from '@/components/GifEditor'
import LogViewer from '@/components/LogViewer'
import { notFound } from 'next/navigation'
import { getProducts, titleToSlug } from '@/lib/products'

// Generate static params for static export
export async function generateStaticParams() {
  const products = getProducts()
  return products.map((product) => ({
    slug: titleToSlug(product.title),
  }))
}

interface ProductDetailPageProps {
  params: {
    slug: string
  }
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const products = getProducts()
  const product = products.find(p => titleToSlug(p.title) === params.slug)

  if (!product) {
    notFound()
  }

  const isImageEditor = params.slug === 'image-editor'
  const isGifEditor = params.slug === 'gif-editor'
  const isLogViewer = params.slug === 'log-viewer'

  return (
    <main className={`${isImageEditor || isGifEditor || isLogViewer ? 'h-screen pt-16 flex flex-col' : 'min-h-screen pt-16'}`}>
      {/* Product Details Section */}
      <section className={`${isImageEditor || isGifEditor || isLogViewer ? 'flex-1 overflow-auto pb-4 sm:pb-6 lg:pb-8' : 'py-20'} px-4 sm:px-6 lg:px-8 bg-gray-50`}>
        {isImageEditor ? (
          /* Image Editor Component - Full Width and Height */
          <div className="w-full h-full min-h-0">
            <ImageEditor />
          </div>
        ) : isGifEditor ? (
          /* GIF Editor Component - Full Width and Height */
          <div className="w-full h-full min-h-0">
            <GifEditor />
          </div>
        ) : isLogViewer ? (
          /* Log Viewer Component - Full Width and Height */
          <div className="w-full h-full min-h-0">
            <LogViewer />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/product"
                className="inline-block text-center bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
              >
                ← Back to Products
              </Link>
              <Link
                href="/contact"
                className="inline-block text-center bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </section>

      {!isImageEditor && !isGifEditor && !isLogViewer && <Footer />}
    </main>
  )
}

