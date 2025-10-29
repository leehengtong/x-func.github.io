import Link from 'next/link'
import Logo from './Logo'

export default function Footer() {
  return (
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
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  AI Image Editor
                </Link>
              </li>
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  Language Learning
                </Link>
              </li>
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  Stock Analysis
                </Link>
              </li>
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  News Aggregation
                </Link>
              </li>
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
  )
}

