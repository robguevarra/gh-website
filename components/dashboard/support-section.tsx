"use client"

import { HelpCircle, Lightbulb, Mail, MessageSquare, Info, ChevronDown, ChevronUp, PlusCircle, MinusCircle } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export interface FAQ {
  id: string
  question: string
  answer: string
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
  // Track which FAQs are expanded
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({})
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
    // Toggle the expanded state of the FAQ
    setExpandedFaqs(prev => ({
      ...prev,
      [faqId]: !prev[faqId]
    }))
    
    // Call the external handler if provided
    if (onFaqClick) {
      onFaqClick(faqId)
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
                        className="rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div 
                          className="p-3 flex items-center justify-between"
                          onClick={() => handleFaqClick(faq.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <h4 className="font-medium text-sm">{faq.question}</h4>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedFaqs[faq.id] ? (
                              <MinusCircle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <PlusCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: expandedFaqs[faq.id] ? 'auto' : 0,
                            opacity: expandedFaqs[faq.id] ? 1 : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0">
                            <div className="pl-6 text-sm text-gray-600 border-l border-amber-100 ml-2">
                              {faq.answer}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ))
                  ) : (
                    // Default FAQs when none are provided
                    <>
                      <div className="rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all cursor-pointer">
                        <div 
                          className="p-3 flex items-center justify-between"
                          onClick={() => handleFaqClick("templates-access")}
                        >
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <h4 className="font-medium text-sm">How do I access my templates?</h4>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedFaqs["templates-access"] ? (
                              <MinusCircle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <PlusCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: expandedFaqs["templates-access"] ? 'auto' : 0,
                            opacity: expandedFaqs["templates-access"] ? 1 : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0">
                            <div className="pl-6 text-sm text-gray-600 border-l border-amber-100 ml-2">
                              You can access all templates in the Templates Library section of your dashboard. Click on any template to preview it, then download or use it directly.
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all cursor-pointer">
                        <div 
                          className="p-3 flex items-center justify-between"
                          onClick={() => handleFaqClick("commercial-license")}
                        >
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <h4 className="font-medium text-sm">Can I sell products made with the templates?</h4>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedFaqs["commercial-license"] ? (
                              <MinusCircle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <PlusCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: expandedFaqs["commercial-license"] ? 'auto' : 0,
                            opacity: expandedFaqs["commercial-license"] ? 1 : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0">
                            <div className="pl-6 text-sm text-gray-600 border-l border-amber-100 ml-2">
                              Yes! All templates come with a commercial license that allows you to sell physical and digital products created with them. The only restriction is that you cannot resell the template files themselves.
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all cursor-pointer">
                        <div 
                          className="p-3 flex items-center justify-between"
                          onClick={() => handleFaqClick("live-classes")}
                        >
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <h4 className="font-medium text-sm">How do I join the live classes?</h4>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedFaqs["live-classes"] ? (
                              <MinusCircle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <PlusCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: expandedFaqs["live-classes"] ? 'auto' : 0,
                            opacity: expandedFaqs["live-classes"] ? 1 : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0">
                            <div className="pl-6 text-sm text-gray-600 border-l border-amber-100 ml-2">
                              You can join live classes directly from the Live Classes section of your dashboard. Click on any upcoming class to see details and access the link to join when it's time.
                            </div>
                          </div>
                        </motion.div>
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
