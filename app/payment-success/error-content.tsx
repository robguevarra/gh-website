"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

interface ErrorContentProps {
  errorMessage: string;
}

export function ErrorContent({ errorMessage }: ErrorContentProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-[#f8f5f1]">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-red-100/50"></div>
            <div className="absolute top-1/2 -left-12 w-16 h-16 rounded-full bg-red-100/30"></div>
            
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-serif text-[#5d4037]">Confirmation Error</h1>
            <p className="text-[#6d4c41] mt-2">{errorMessage}</p>
            <div className="pt-6">
              <Link href="/">
                <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
