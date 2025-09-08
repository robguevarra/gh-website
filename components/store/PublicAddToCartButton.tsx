'use client'

import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cartStore'
import { Loader2, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

interface PublicAddToCartButtonProps {
  productId: string
  title: string
  price: number
  imageUrl: string
  size?: 'sm' | 'md' | 'lg'
}

export default function PublicAddToCartButton({ productId, title, price, imageUrl, size = 'md' }: PublicAddToCartButtonProps) {
  const addItem = useCartStore(state => state.addItem)
  const openCartSheet = useCartStore(state => state.openCartSheet)
  const [loading, setLoading] = useState(false)

  const handleAdd = () => {
    setLoading(true)
    try {
      addItem({ productId, title: title || 'Untitled Product', price: Number(price) || 0, imageUrl: imageUrl || '', quantity: 1 })
      openCartSheet()
    } finally {
      setLoading(false)
    }
  }

  const className = size === 'sm'
    ? 'h-9 px-3'
    : size === 'lg'
      ? 'h-12 px-5 text-base'
      : 'h-10 px-4'

  return (
    <Button onClick={handleAdd} className={`bg-primary text-primary-foreground hover:bg-primary/90 ${className}`} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
      Add to Cart
    </Button>
  )
}



