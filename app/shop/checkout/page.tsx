'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { useCartStore, selectCartItems, selectCartTotalPrice } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPHP } from '@/lib/utils/formatting'
import { createPublicSalePaymentIntent } from '@/app/actions/public-sale-actions'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Heart, 
  Clock, 
  Download, 
  CheckCircle2, 
  Users, 
  Star, 
  Lock,
  Truck,
  RefreshCw,
  Mail
} from 'lucide-react'

export default function PublicCheckoutPage() {
  const router = useRouter()
  const items = useCartStore(selectCartItems)
  const total = useCartStore(selectCartTotalPrice)
  const clearCart = useCartStore(state => state.clearCart)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  const isEmpty = items.length === 0
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.firstName || !form.lastName) return 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required'
    if (!/^\+?[\d\s-()]{10,}$/.test(form.phone)) return 'Valid phone is required'
    if (isEmpty) return 'Your cart is empty'
    return null
  }

  const handlePay = async () => {
    const v = validate()
    if (v) { setError(v); return }
    setIsProcessing(true)
    setError(null)
    try {
      // Lead capture (aggregate) - optional per item, simplified aggregate lead
      try {
        await fetch('/api/leads/capture', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            productType: 'SHOPIFY_ECOM',
            amount: total,
            currency: 'PHP',
            sourcePage: '/shop/checkout',
            metadata: { cartCount: items.length, items: items.map(i => ({ id: i.productId, title: i.title })) }
          })
        })
      } catch {}

      // Aggregate into a single invoice using public sale action (one-line item name)
      const response = await createPublicSalePaymentIntent({
        amount: total,
        currency: 'PHP',
        paymentMethod: 'invoice',
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        description: 'Graceful Homeschooling Shop Order',
        productCode: 'cart_order',
        productName: 'Cart Order',
        metadata: { items: items.map(i => ({ id: i.productId, title: i.title, price: i.price })), source: 'website' }
      })

      if (response.error || !response.invoice_url) throw new Error(response.message || 'Payment failed')
      clearCart()
      window.location.href = response.invoice_url
    } catch (err: any) {
      setError(err?.message || 'Payment processing failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white">
      <PublicHeader />
      
      <main className="container mx-auto px-6 py-16">
        {/* Header Section */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-[#5d4037] mb-4">
            Secure Checkout
          </h1>
          <p className="text-[#6d4c41] text-lg max-w-2xl mx-auto">
            Complete your order for thoughtfully curated homeschooling resources. 
            Your digital downloads will be delivered instantly after payment.
          </p>
        </motion.div>

        {isEmpty ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-center py-16"
          >
            <div className="bg-white rounded-xl border p-8 shadow-sm max-w-md mx-auto">
              <h2 className="text-xl font-serif text-[#5d4037] mb-2">Your cart is empty</h2>
              <p className="text-[#6d4c41] mb-4">Browse our collection of homeschooling resources</p>
              <Button onClick={() => router.push('/shop')} className="bg-[#b08ba5] hover:bg-[#9a7b90] text-white">
                Continue Shopping
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-8 lg:grid-cols-3"
          >
            {/* Main Checkout Form */}
            <motion.div variants={fadeIn} className="lg:col-span-2 space-y-6">
              {/* Trust Banner */}
              <Card className="border-2 border-[#b08ba5]/20 bg-gradient-to-r from-[#b08ba5]/5 to-[#f1b5bc]/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-6 w-6 text-[#b08ba5]" />
                    <h3 className="font-serif text-lg text-[#5d4037]">Why Homeschooling Parents Trust Us</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#b08ba5]" />
                      <span className="text-[#6d4c41]">500+ Families Served</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#b08ba5]" />
                      <span className="text-[#6d4c41]">Educator-Approved Content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-[#b08ba5]" />
                      <span className="text-[#6d4c41]">Made by Homeschool Mom</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-[#5d4037] flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Your Information
                  </CardTitle>
                  <p className="text-sm text-[#6d4c41]">
                    We'll send your digital downloads to this email address immediately after payment.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#5d4037]">First Name</label>
                      <Input 
                        name="firstName" 
                        value={form.firstName} 
                        onChange={onChange}
                        className="border-[#b08ba5]/20 focus:border-[#b08ba5]"
                        placeholder="Your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#5d4037]">Last Name</label>
                      <Input 
                        name="lastName" 
                        value={form.lastName} 
                        onChange={onChange}
                        className="border-[#b08ba5]/20 focus:border-[#b08ba5]"
                        placeholder="Your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#5d4037]">Email Address</label>
                      <Input 
                        name="email" 
                        type="email" 
                        value={form.email} 
                        onChange={onChange}
                        className="border-[#b08ba5]/20 focus:border-[#b08ba5]"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#5d4037]">Phone Number</label>
                      <Input 
                        name="phone" 
                        type="tel" 
                        value={form.phone} 
                        onChange={onChange}
                        className="border-[#b08ba5]/20 focus:border-[#b08ba5]"
                        placeholder="+63 XXX XXX XXXX"
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                    >
                      {error}
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Security & Trust Badges */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="h-6 w-6 text-green-600" />
                    <h3 className="font-serif text-lg text-[#5d4037]">Your Purchase is Protected</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#5d4037]">Secure Payment</p>
                        <p className="text-[#6d4c41]">Powered by Xendit with bank-level encryption</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Download className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#5d4037]">Instant Access</p>
                        <p className="text-[#6d4c41]">Download links delivered immediately</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#5d4037]">Satisfaction Guarantee</p>
                        <p className="text-[#6d4c41]">7-day refund policy for peace of mind</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#5d4037]">Lifetime Access</p>
                        <p className="text-[#6d4c41]">Re-download anytime from your account</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Button */}
              <Button 
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-[#b08ba5] to-[#9a7b90] hover:from-[#9a7b90] hover:to-[#8b6c81] text-white shadow-lg transition-all duration-300 hover:shadow-xl" 
                disabled={isProcessing} 
                onClick={handlePay}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing Your Order...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Complete Secure Purchase • {formatCurrencyPHP(total)}
                  </div>
                )}
              </Button>
              
              <p className="text-xs text-center text-[#6d4c41] mt-2">
                By completing your purchase, you agree to our terms of service and privacy policy. 
                Your download links will be sent to the email address provided above.
              </p>
            </motion.div>

            {/* Order Summary Sidebar */}
            <motion.div variants={fadeIn}>
              <Card className="sticky top-24 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-[#b08ba5] to-[#f1b5bc] text-white rounded-t-lg">
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Your Homeschool Resources
                  </CardTitle>
                  <p className="text-white/90 text-sm">
                    Ready-to-use materials for your family's learning journey
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.productId} className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-[#b08ba5]/10 rounded-lg flex items-center justify-center">
                          <Download className="h-5 w-5 text-[#b08ba5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#5d4037] line-clamp-2">{item.title}</p>
                          <p className="text-xs text-[#6d4c41]">Digital Download</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#5d4037]">{formatCurrencyPHP(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6d4c41]">Subtotal ({items.length} items)</span>
                      <span className="font-medium">{formatCurrencyPHP(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6d4c41]">Processing Fee</span>
                      <span className="font-medium text-green-600">FREE</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6d4c41]">Delivery</span>
                      <span className="font-medium text-green-600">Instant</span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-serif text-[#5d4037]">Total</span>
                    <span className="text-2xl font-bold text-[#b08ba5]">{formatCurrencyPHP(total)}</span>
                  </div>
                  
                  <div className="mt-6 p-4 bg-[#b08ba5]/5 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Heart className="h-4 w-4 text-[#b08ba5] mt-0.5" />
                      <div className="text-xs text-[#6d4c41]">
                        <p className="font-medium mb-1">Supporting Homeschool Families</p>
                        <p>Your purchase helps us create more quality resources for the homeschooling community.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>
      
      <PublicFooter />
    </div>
  )
}


