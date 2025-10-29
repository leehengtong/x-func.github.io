import Link from 'next/link'
import Footer from '@/components/Footer'

export default function MissionPage() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Our Mission</h1>
          <p className="text-xl md:text-2xl text-primary-100">
            Empowering the world through accessible AI technology
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Use AI to Empower the World
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                At x-func, we believe that artificial intelligence should be accessible to everyone. 
                Our mission is to make AI available for everyone by providing easy-to-use tooling and 
                improving efficiency across all industries and sectors.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                We envision a world where advanced AI capabilities are not limited to large corporations 
                or tech giants, but are accessible to individuals, small businesses, students, and 
                organizations of all sizes.
              </p>
            </div>

            {/* Values Section */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Impact</h3>
                <p className="text-gray-700">
                  Creating solutions that benefit people worldwide, regardless of their background or location.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
                <div className="text-4xl mb-4">🔓</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Accessibility</h3>
                <p className="text-gray-700">
                  Making complex AI technology simple and user-friendly for everyone.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Efficiency</h3>
                <p className="text-gray-700">
                  Streamlining workflows and processes to save time and increase productivity.
                </p>
              </div>
            </div>

            {/* Goals Section */}
            <div className="bg-gray-50 rounded-lg p-8 md:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Goals</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-primary-600 text-2xl mr-4">✓</span>
                  <span className="text-lg text-gray-700">
                    Democratize AI technology and make it available to individuals and businesses of all sizes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 text-2xl mr-4">✓</span>
                  <span className="text-lg text-gray-700">
                    Develop intuitive tools that require minimal technical knowledge to use
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 text-2xl mr-4">✓</span>
                  <span className="text-lg text-gray-700">
                    Improve efficiency and productivity across various industries and use cases
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 text-2xl mr-4">✓</span>
                  <span className="text-lg text-gray-700">
                    Foster innovation by providing powerful AI capabilities to creators and entrepreneurs
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Join Us on Our Mission</h2>
          <p className="text-lg text-gray-700 mb-8">
            Explore our products and see how we&apos;re making AI accessible to everyone.
          </p>
          <Link
            href="/product"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
          >
            View Our Products
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  )
}

