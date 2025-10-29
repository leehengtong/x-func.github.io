import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import Logo from '@/components/Logo'

export default function Home() {
  const products = [
    {
      title: 'AI Image Editor',
      description: 'Edit images with advanced AI capabilities',
      icon: '🎨',
      href: '/product'
    },
    {
      title: 'AI Language Learning',
      description: 'Make language learning easy and accessible',
      icon: '🌐',
      href: '/product'
    },
    {
      title: 'Stock Market Analysis',
      description: 'Use AI to analyze stock markets and identify trending opportunities',
      icon: '📈',
      href: '/product'
    },
    {
      title: 'News Aggregation',
      description: 'Aggregate news content and highlight the most useful information',
      icon: '📰',
      href: '/product'
    },
  ]

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Empowering the World with{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto mb-8">
            Making AI available for everyone. Providing easy-to-use tooling and improving efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/product"
              className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Explore Products
            </Link>
            <Link
              href="/mission"
              className="inline-block bg-primary-500 text-white border-2 border-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-400 transition-colors duration-200"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Overview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              AI-Powered Solutions for Everyone
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover how we&apos;re making advanced AI technology accessible, intuitive, and powerful for individuals and businesses worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-600 mb-4">
                Use AI to empower the world and make it available for everyone.
              </p>
              <Link
                href="/mission"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Learn more →
              </Link>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Our Products</h3>
              <p className="text-gray-600 mb-4">
                Powerful AI tools designed for accessibility and efficiency.
              </p>
              <Link
                href="/product"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View products →
              </Link>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Our Story</h3>
              <p className="text-gray-600 mb-4">
                A project aimed to change the world through AI innovation.
              </p>
              <Link
                href="/about"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                About us →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Products Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our AI Solutions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our comprehensive suite of AI-powered tools
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {products.map((product, index) => (
              <Link key={index} href={product.href}>
                <ProductCard
                  title={product.title}
                  description={product.description}
                  icon={product.icon}
                />
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/product"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join us in making AI accessible to everyone. Get in touch to learn more about our solutions.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4 group">
                <Logo className="w-6 h-6" />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                  x-func
                </h3>
              </Link>
              <p className="text-gray-400">
                Empowering the world with accessible AI technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Navigation</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/mission" className="hover:text-white transition-colors">
                    Mission
                  </Link>
                </li>
                <li>
                  <Link href="/product" className="hover:text-white transition-colors">
                    Products
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors">AI Image Editor</li>
                <li className="hover:text-white transition-colors">Language Learning</li>
                <li className="hover:text-white transition-colors">Stock Analysis</li>
                <li className="hover:text-white transition-colors">News Aggregation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">
                <a href="mailto:a@b.com" className="hover:text-white transition-colors">
                  a@b.com
                </a>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} x-func. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

