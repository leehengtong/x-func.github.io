import Link from 'next/link'
import Footer from '@/components/Footer'

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">About x-func</h1>
          <p className="text-xl md:text-2xl text-primary-100">
            Changing the world through accessible and powerful AI tools
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              x-func was born from a simple belief: artificial intelligence should be accessible to everyone, 
              not just large corporations with extensive resources. We saw a gap between the incredible 
              potential of AI technology and its actual availability to individuals, small businesses, and 
              organizations around the world.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Our project is aimed at changing the world through accessible and powerful AI tools. We&apos;re 
              committed to breaking down barriers and making cutting-edge AI capabilities available to 
              creators, entrepreneurs, students, and professionals everywhere.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              By combining advanced technology with intuitive design, we&apos;re building a future where anyone 
              can leverage AI to solve problems, create amazing content, and achieve their goals—regardless 
              of their technical background or resources.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Innovation</h3>
              <p className="text-gray-600">
                Constantly pushing the boundaries of what&apos;s possible with AI technology.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Accessibility</h3>
              <p className="text-gray-600">
                Making powerful tools available to everyone, regardless of technical expertise.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Simplicity</h3>
              <p className="text-gray-600">
                Complex technology made simple through thoughtful design and user experience.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Growth</h3>
              <p className="text-gray-600">
                Committed to continuous improvement and evolution of our platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              We envision a world where AI tools are as common and easy to use as smartphones. Where a 
              student can create professional-grade content, a small business can compete with enterprise 
              solutions, and anyone with an idea can bring it to life with the power of artificial intelligence.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Our goal is to democratize AI technology, making it accessible not just in terms of cost, 
              but also in terms of usability and understanding. We believe that when powerful tools are 
              made accessible to everyone, innovation flourishes and amazing things happen.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Join us as we work towards a future where AI empowers everyone to achieve more, create more, 
              and dream bigger.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want to Learn More?</h2>
          <p className="text-lg text-primary-100 mb-8">
            Explore our mission, discover our products, or get in touch with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mission"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Our Mission
            </Link>
            <Link
              href="/product"
              className="inline-block bg-primary-700 text-white border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors duration-200"
            >
              Our Products
            </Link>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}

