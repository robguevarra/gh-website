'use client'

import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <PublicHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-serif text-[#5d4037] mb-2">Cookie Policy</h1>
          <p className="text-[#6d4c41] mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">What Are Cookies?</h2>
              <p className="text-[#6d4c41] mb-4">
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">How We Use Cookies</h2>
              <div className="text-[#6d4c41] mb-4">
                <h3 className="text-lg font-medium text-[#5d4037] mb-2">Essential Cookies</h3>
                <p className="mb-4">These cookies are necessary for our website to function properly. They enable basic features like page navigation, access to secure areas, and payment processing.</p>
                
                <h3 className="text-lg font-medium text-[#5d4037] mb-2">Analytics Cookies</h3>
                <p className="mb-4">We use analytics cookies to understand how visitors interact with our website. This helps us improve our content and user experience.</p>
                
                <h3 className="text-lg font-medium text-[#5d4037] mb-2">Preference Cookies</h3>
                <p className="mb-4">These cookies remember your preferences and settings to provide you with a personalized experience on future visits.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">Third-Party Cookies</h2>
              <p className="text-[#6d4c41] mb-4">
                We may use third-party services like Google Analytics, payment processors, and social media platforms that may place their own cookies on your device. These cookies are governed by the respective third parties' privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">Managing Cookies</h2>
              <p className="text-[#6d4c41] mb-4">
                You can control and manage cookies in various ways:
              </p>
              <ul className="text-[#6d4c41] mb-4 space-y-2">
                <li>• Most browsers allow you to view, manage, and delete cookies through their settings</li>
                <li>• You can set your browser to refuse all cookies or alert you when cookies are being sent</li>
                <li>• Please note that disabling cookies may affect the functionality of our website</li>
                <li>• Some features may not work properly if cookies are disabled</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">Browser Settings</h2>
              <p className="text-[#6d4c41] mb-4">
                Here's how to manage cookies in popular browsers:
              </p>
              <ul className="text-[#6d4c41] mb-4 space-y-2">
                <li>• <strong>Chrome:</strong> Settings {`>`} Privacy and Security {`>`} Cookies and other site data</li>
                <li>• <strong>Firefox:</strong> Settings {`>`} Privacy & Security {`>`} Cookies and Site Data</li>
                <li>• <strong>Safari:</strong> Preferences {`>`} Privacy {`>`} Manage Website Data</li>
                <li>• <strong>Edge:</strong> Settings {`>`} Cookies and site permissions {`>`} Cookies and site data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">Updates to This Policy</h2>
              <p className="text-[#6d4c41] mb-4">
                We may update this cookie policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-[#5d4037] mb-4">Contact Us</h2>
              <p className="text-[#6d4c41]">
                If you have any questions about our use of cookies, please contact us through our social media channels or support email.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 