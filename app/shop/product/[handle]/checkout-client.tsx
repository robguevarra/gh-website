'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createPublicSalePaymentIntent } from '@/app/actions/public-sale-actions'

interface CheckoutClientProps {
  productId: string
  productHandle: string
  productTitle: string
  amount: number
  currency: string
}

export default function CheckoutClient({ productId, productHandle, productTitle, amount, currency }: CheckoutClientProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [error, setError] = useState<string | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError(null)
  }

  const validate = () => {
    if (!formData.firstName || !formData.lastName) return 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid email is required'
    if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) return 'Valid phone is required'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setIsProcessing(true)
    try {
      // Lead capture (best practice)
      try {
        await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            productType: 'SHOPIFY_ECOM',
            amount,
            currency,
            sourcePage: `/shop/product/${productHandle}`,
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            metadata: { product_id: productId, product_handle: productHandle }
          })
        })
      } catch {}

      const res = await createPublicSalePaymentIntent({
        amount,
        currency,
        paymentMethod: 'invoice',
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        description: productTitle,
        productCode: productHandle,
        productName: productTitle,
        metadata: { source: 'website', product_id: productId, product_handle: productHandle }
      })

      if (res.error || !res.invoice_url) throw new Error(res.message || 'Payment failed')
      window.location.href = res.invoice_url
    } catch (err: any) {
      setError(err?.message || 'Payment processing failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" value={formData.firstName} onChange={onChange} required />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" value={formData.lastName} onChange={onChange} required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" value={formData.email} onChange={onChange} required />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={onChange} required />
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}
      <Button type="submit" className="w-full" disabled={isProcessing}>
        {isProcessing ? 'Processing…' : `Buy Now`}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Secure payment via Xendit. You’ll receive a Google Drive link by email after payment.</p>
    </form>
  )
}



