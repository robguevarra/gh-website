"use client"

import { HelpCircle, Lightbulb, Mail, MessageSquare, Info, ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export interface FAQ {
  id: string
  question: string
}

export interface SupportSectionProps {
  faqs: FAQ[]
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
  onEmailSupport?: () => void
  onLiveChat?: () => void
  onFaqClick?: (faqId: string) => void
}

export function SupportSection({
  faqs = [],
  isSectionExpanded,
  toggleSection,
  onEmailSupport,
  onLiveChat,
  onFaqClick
}: SupportSectionProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const handleEmailSupport = () => {
    if (onEmailSupport) {
      onEmailSupport()
    } else {
      // Default behavior
      window.open('mailto:help@gracefulhomeschooling.com', '_blank')
    }
  }

  const handleLiveChat = () => {
    if (onLiveChat) {
      onLiveChat()
    } else {
      // Default behavior - placeholder
      console.log('Live chat functionality coming soon')
    }
  }

  const handleFaqClick = (faqId: string) => {
    if (onFaqClick) {
      onFaqClick(faqId)
    } else {
      // Default behavior - placeholder
      console.log(`FAQ clicked: ${faqId}`)
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.4 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("support")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-full p-2">
              <HelpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Support & Help</h2>
          </div>
          {isSectionExpanded("support") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("support") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100 rounded-full p-2">
                  <HelpCircle className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Support & Help</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg p-5 border border-amber-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-medium text-[#5d4037]">Need Help?</h3>
                </div>

                <p className="text-sm text-[#6d4c41] mb-4">
                  We're here to help you with any questions about the course or your paper products business.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2"
                    onClick={handleEmailSupport}
                  >
                    <Mail className="h-4 w-4" />
                    Email Support
                  </Button>
                  <Button
                    variant="outline"
                    className="border-amber-600 text-amber-600 hover:bg-amber-50 flex items-center justify-center gap-2"
                    onClick={handleLiveChat}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Live Chat
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-[#5d4037] mb-2">Common Questions</h3>
                <div className="space-y-2">
                  {faqs.length > 0 ? (
                    faqs.map((faq) => (
                      <div 
                        key={faq.id}
                        className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleFaqClick(faq.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          <h4 className="font-medium text-sm">{faq.question}</h4>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Default FAQs when none are provided
                    <>
                      <div 
                        className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleFaqClick("templates-access")}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          <h4 className="font-medium text-sm">How do I access my templates?</h4>
                        </div>
                      </div>
                      <div 
                        className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleFaqClick("commercial-license")}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          <h4 className="font-medium text-sm">Can I sell products made with the templates?</h4>
                        </div>
                      </div>
                      <div 
                        className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleFaqClick("live-classes")}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          <h4 className="font-medium text-sm">How do I join the live classes?</h4>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
