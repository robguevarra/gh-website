'use client'

import Image from "next/image"
import Link from "next/link"

interface PublicFooterProps {
  className?: string
}

export function PublicFooter({ className = "" }: PublicFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`w-full border-t border-[#e7d9ce] bg-[#f9f6f2] ${className}`}>
      <div className="container flex flex-col gap-8 px-4 py-10 md:px-6 lg:flex-row lg:gap-12">
        <div className="flex flex-col gap-4 lg:w-1/3">
          <div className="flex items-center gap-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png"
              alt="Graceful Homeschooling Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
            <span className="text-xl font-serif tracking-tight text-[#5d4037]">Graceful Homeschooling</span>
          </div>
          <p className="text-[#6d4c41] font-light">
            Empowering homeschooling parents with tools, resources, and insights to enhance their educational journey.
          </p>
          <div className="flex gap-4">
            {[
              { name: "Instagram", href: "https://www.instagram.com/gracefulhomeschooling/" },
              { name: "Facebook", href: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/" },
              { name: "YouTube", href: "https://www.youtube.com/@gracefulhomeschooling" }
            ].map((social) => (
              <Link
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-purple hover:text-[#8d6e63] transition-colors duration-200"
              >
                {social.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#5d4037]">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { name: "Home", href: "/" },
                { name: "Papers to Profits", href: "/papers-to-profits" },
                { name: "Shop", href: "/shop" },
                { name: "Login", href: "/auth/signin" }
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#5d4037]">Resources</h4>
            <ul className="space-y-2">
              {[
                { name: "YouTube Channel", href: "https://www.youtube.com/@gracefulhomeschooling" },
                { name: "Facebook Community", href: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/" }
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#5d4037]">Legal</h4>
            <ul className="space-y-2">
              {[
                { name: "Terms", href: "/legal/terms" },
                { name: "Privacy", href: "/legal/privacy" },
                { name: "Cookies", href: "/legal/cookies" }
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[#e7d9ce]">
        <div className="container flex flex-col gap-2 px-4 py-6 text-center md:flex-row md:justify-between md:px-6 md:text-left">
          <p className="text-xs text-[#6d4c41]">
            &copy; {currentYear} Graceful Homeschooling by Graceful Publications. All rights reserved.
          </p>
          <p className="text-xs text-[#6d4c41]">Designed with grace for homeschooling families.</p>
        </div>
      </div>
    </footer>
  )
} 