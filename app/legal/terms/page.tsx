'use client'

import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-serif text-[#5d4037] mb-2">Terms of Service</h1>
          <p className="text-[#6d4c41] mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">1. Agreement to Terms</h2>
              <p className="text-[#6d4c41] mb-4">
                By accessing and using Graceful Homeschooling ("we," "our," or "us"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">2. Educational Content</h2>
              <p className="text-[#6d4c41] mb-4">
                Our platform provides educational resources, courses, and materials for homeschooling families. All content is for educational purposes only and should not replace professional educational assessment or guidance when needed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">3. User Accounts</h2>
              <p className="text-[#6d4c41] mb-4">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">4. Payments and Refunds</h2>
              <p className="text-[#6d4c41] mb-4">
                All purchases are final unless otherwise stated. Digital products are delivered immediately upon successful payment. Physical products will be shipped according to our shipping policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">5. Intellectual Property</h2>
              <p className="text-[#6d4c41] mb-4">
                All content, materials, and resources on this platform are protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">6. Limitation of Liability</h2>
              <p className="text-[#6d4c41] mb-4">
                Graceful Homeschooling shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">7. Changes to Terms</h2>
              <p className="text-[#6d4c41] mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">8. Contact Information</h2>
              <p className="text-[#6d4c41]">
                If you have any questions about these Terms of Service, please contact us through our social media channels or email support.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 