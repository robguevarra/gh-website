"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckoutModal } from "@/components/checkout/checkout-modal"

interface CheckoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function CheckoutButton({ className, children }: CheckoutButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <>
      <Button onClick={openModal} className={className}>
        {children || "Checkout"}
      </Button>
      <CheckoutModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  )
}

