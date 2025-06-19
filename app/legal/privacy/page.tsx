'use client'

import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-serif text-[#5d4037] mb-2">Privacy Policy</h1>
          <p className="text-[#6d4c41] mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">1. Information We Collect</h2>
              <p className="text-[#6d4c41] mb-4">
                We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This may include your name, email address, phone number, and payment information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">2. How We Use Your Information</h2>
              <ul className="text-[#6d4c41] mb-4 space-y-2">
                <li>• To provide, maintain, and improve our services</li>
                <li>• To process transactions and send related information</li>
                <li>• To send educational content and updates</li>
                <li>• To respond to your comments, questions, and customer service requests</li>
                <li>• To communicate with you about products, services, and events</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">3. Information Sharing</h2>
              <p className="text-[#6d4c41] mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information with trusted service providers who assist us in operating our website and conducting our business.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">4. Data Security</h2>
              <p className="text-[#6d4c41] mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">5. Cookies and Tracking</h2>
              <p className="text-[#6d4c41] mb-4">
                We use cookies and similar tracking technologies to improve your browsing experience, analyze site traffic, and understand where our visitors are coming from. You can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">6. Children's Privacy</h2>
              <p className="text-[#6d4c41] mb-4">
                Our service is intended for parents and educators. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">7. Your Rights</h2>
              <p className="text-[#6d4c41] mb-4">
                You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us. To exercise these rights, please contact us through our available channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">8. Changes to This Policy</h2>
              <p className="text-[#6d4c41]">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "last updated" date.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 