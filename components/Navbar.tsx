'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

// Utility function to convert title to slug
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const navItems = [
  { name: 'Mission', href: '/mission' },
  { name: 'Product', href: '/product', isDropdown: true },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const products = [
  { title: 'AI Image Editor' },
  { title: 'AI Language Learning' },
  { title: 'Stock Market Analysis' },
  { title: 'News Aggregation' },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const [isMobileProductOpen, setIsMobileProductOpen] = useState(false)
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false)
      }
    }
    if (isProductDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProductDropdownOpen])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <Logo className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                item.isDropdown ? (
                  <div
                    key={item.name}
                    ref={dropdownRef}
                    className="relative"
                    onMouseEnter={() => setIsProductDropdownOpen(true)}
                    onMouseLeave={() => setIsProductDropdownOpen(false)}
                  >
                    <Link
                      href={item.href}
                      className={`px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center ${
                        pathname === item.href || pathname?.startsWith('/product/')
                          ? 'text-primary-600 border-b-2 border-primary-600'
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      {item.name}
                      <svg
                        className={`ml-1 w-4 h-4 transition-transform duration-200 ${
                          isProductDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                    {isProductDropdownOpen && (
                      <>
                        <div className="absolute top-full left-0 h-2 w-full" />
                        <div className="absolute top-full left-0 mt-2 w-48 z-50">
                          <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                            {products.map((product) => (
                              <Link
                                key={product.title}
                                href={`/product/${titleToSlug(product.title)}`}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors duration-150"
                                onClick={() => setIsProductDropdownOpen(false)}
                              >
                                {product.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 text-base font-medium transition-colors duration-200 ${
                      pathname === item.href
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </div>
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-primary-600 focus:outline-none"
              aria-label="Menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              item.isDropdown ? (
                <div key={item.name}>
                  <button
                    onClick={() => setIsMobileProductOpen(!isMobileProductOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-lg font-medium ${
                      pathname === item.href || pathname?.startsWith('/product/')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isMobileProductOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isMobileProductOpen && (
                    <div className="pl-4 pr-2 pt-1 pb-2 space-y-1">
                      {products.map((product) => (
                        <Link
                          key={product.title}
                          href={`/product/${titleToSlug(product.title)}`}
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setIsMobileProductOpen(false)
                          }}
                          className="block px-3 py-2 rounded-md text-base text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                        >
                          {product.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-lg font-medium ${
                    pathname === item.href
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

