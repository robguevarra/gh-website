'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { useMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface PublicHeaderProps {
  onHoverChange?: (isHovering: boolean) => void
}

export function PublicHeader({ onHoverChange }: PublicHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleHover = (isHovering: boolean) => {
    onHoverChange?.(isHovering)
  }

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/p2p-order-form', label: 'Papers to Profits' },
    { href: '/canva-order', label: 'Get Ebook' },
    { href: '/advent', label: '🔥 12 Days of Christmas' },
    { href: '/shop', label: 'Shop' }
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled
          ? 'backdrop-blur-md supports-[backdrop-filter]:bg-[#f9f6f2]/80 shadow-sm'
          : 'backdrop-blur-md supports-[backdrop-filter]:bg-[#f9f6f2]/60'
        }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size={isMobile ? 'small' : 'medium'} />
        </motion.div>

        {/* Desktop Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:flex gap-6"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
              onMouseEnter={() => handleHover(true)}
              onMouseLeave={() => handleHover(false)}
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </motion.nav>

        {/* Desktop Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden md:flex items-center gap-4"
        >
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
          >
            Login
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Button
            className="relative overflow-hidden bg-transparent border border-brand-purple text-brand-purple hover:text-white group"
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            asChild
          >
            <Link href="/p2p-order-form">
              <span className="absolute inset-0 w-full h-full bg-brand-purple translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0"></span>
              <span className="relative flex items-center gap-1 z-10 group-hover:text-white transition-colors duration-300">
                Get Started
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </Button>
        </motion.div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-[#f9f6f2]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between py-4 border-b border-[#e7d9ce]">
                  <Logo size="small" />
                </div>

                <nav className="flex-1 py-6">
                  <div className="space-y-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block text-[#5d4037] hover:text-brand-purple transition-colors py-2 text-base font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </nav>

                <div className="border-t border-[#e7d9ce] pt-6 space-y-4">
                  <Link
                    href="/auth/signin"
                    className="block text-[#5d4037] hover:text-brand-purple transition-colors py-2 text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Button
                    className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white"
                    asChild
                  >
                    <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
} 