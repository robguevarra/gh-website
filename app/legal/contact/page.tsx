'use client'

import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { Mail, MessageCircle, Clock, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-[#5d4037] mb-4">Get in Touch</h1>
            <p className="text-[#6d4c41] text-lg font-light max-w-2xl mx-auto">
              We'd love to hear from you! Whether you have questions about our resources, need support, or want to share your homeschooling journey, we're here to help.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Facebook Messaging */}
            <div className="bg-brand-purple/5 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-brand-purple" />
              </div>
              <h3 className="text-xl font-serif text-[#5d4037] mb-3">Message Us on Facebook</h3>
              <p className="text-[#6d4c41] mb-6 text-sm">
                Connect with our community and send us a direct message. We typically respond within a few hours during business days.
              </p>
              <Button asChild className="bg-brand-purple hover:bg-[#8d6e63] text-white px-6 py-3 rounded-full">
                <Link
                  href="https://www.facebook.com/GracefulHomeschoolingbyEmigrace/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Visit Our Facebook Page
                </Link>
              </Button>
            </div>

            {/* Email Contact */}
            <div className="bg-brand-pink/10 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-brand-pink/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-brand-purple" />
              </div>
              <h3 className="text-xl font-serif text-[#5d4037] mb-3">Email Support</h3>
              <p className="text-[#6d4c41] mb-6 text-sm">
                For detailed questions, support requests, or business inquiries, feel free to email us directly.
              </p>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-[#e7d9ce]">
                  <p className="text-sm text-[#6d4c41] mb-1">Email us at:</p>
                  <p className="font-medium text-brand-purple">help@gracefulhomeschooling.com</p>
                </div>
                <Button asChild variant="outline" className="border-brand-purple text-brand-purple hover:bg-brand-purple/10 px-6 py-3 rounded-full">
                  <Link href="mailto:help@gracefulhomeschooling.com">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-brand-blue/10 rounded-xl p-6 text-center mb-8">
            <Clock className="h-8 w-8 text-brand-purple mx-auto mb-3" />
            <h3 className="text-lg font-serif text-[#5d4037] mb-2">Response Times</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-[#6d4c41]">
              <div>
                <strong>Facebook Messages:</strong> Within a few hours (business days)
              </div>
              <div>
                <strong>Email Support:</strong> Within 24-48 hours
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-brand-pink" />
              <h3 className="text-lg font-serif text-[#5d4037]">More Ways to Connect</h3>
            </div>
            <p className="text-[#6d4c41] mb-6">
              Join our community for daily inspiration, tips, and resources for your homeschooling journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="outline" size="sm" className="border-brand-purple text-brand-purple hover:bg-brand-purple/10">
                <Link
                  href="https://www.youtube.com/@gracefulhomeschooling"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube Channel
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-brand-purple text-brand-purple hover:bg-brand-purple/10">
                <Link
                  href="https://www.instagram.com/gracefulhomeschooling/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 