"use client";

import { useEffect } from "react";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

// Define props for the success content
interface SuccessContentProps {
  firstName?: string;
  confirmationLine1: string;
  confirmationLine2: string;
  productName: string;
  externalId?: string;
  amountPaid?: number;
  formattedAmount: string;
  productType: string;
}

export function SuccessContent({
  firstName,
  confirmationLine1,
  confirmationLine2,
  productName,
  externalId,
  amountPaid,
  formattedAmount,
  productType,
}: SuccessContentProps) {
  useEffect(() => {
    // Fire Facebook Pixel Purchase event ONLY for Papers to Profits Course
    if (
      typeof window !== 'undefined' &&
      (window as any).fbq &&
      amountPaid &&
      productName === "Papers to Profits Course"
    ) {
      (window as any).fbq('track', 'Purchase', {
        currency: 'PHP',
        value: amountPaid,
        content_name: productName,
        content_ids: externalId ? [externalId] : [],
        content_type: 'product',
        event_id: externalId // Important for deduplication with server-side event
      });
      console.log("Facebook Pixel Purchase event fired for P2P", { amountPaid, externalId });
    }
  }, [amountPaid, productName, externalId]);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-[#f8f5f1] relative overflow-hidden">
        {/* Decorative elements in background */}
        <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-[#f0e6dd] blur-3xl opacity-50"></div>
        <div className="absolute bottom-20 left-[5%] w-80 h-80 rounded-full bg-[#f0e6dd] blur-3xl opacity-30"></div>

        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            {/* Success message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="inline-block mb-4 px-4 py-1 bg-[#f0e6dd] rounded-full text-sm font-medium text-[#ad8174]"
                >
                  Payment Confirmed
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="text-3xl md:text-4xl font-serif text-[#5d4037] mb-4"
                >
                  Thank You For Your Purchase!
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="text-lg text-[#6d4c41]">
                  {confirmationLine1}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="bg-white shadow-md rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#f0e6dd] flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[#ad8174]" />
                  </div>
                  <h2 className="text-xl font-serif text-[#5d4037]">Order Details</h2>
                </div>

                <div className="space-y-3 text-[#6d4c41]">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="font-medium">Product</span>
                    <span>{productName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="font-medium">Order Reference</span>
                    <span className="font-mono text-sm">{externalId || 'N/A'}</span>
                  </div>
                  {amountPaid !== null && amountPaid !== undefined && (
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <span className="font-medium">Amount Paid</span>
                      <span className="font-medium text-[#ad8174]">{formattedAmount}</span>
                    </div>
                  )}

                  <div className="pt-2 text-sm">
                    <p>{confirmationLine2}</p>
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <Link href="/" className="flex-1">
                    <Button className="w-full bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Return to Home
                    </Button>
                  </Link>

                  {/* Show this button only for courses, not for ebooks */}
                  {productType === 'course' && (
                    <Link href="/dashboard/my-courses" className="flex-1">
                      <Button variant="outline" className="w-full border-[#ad8174] text-[#ad8174] hover:bg-[#ad8174]/10">
                        <span>Go to My Courses</span>
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
