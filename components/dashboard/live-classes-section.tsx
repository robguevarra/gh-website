"use client"

import Link from "next/link"
import { Calendar, ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface LiveClass {
  id: string
  title: string
  date: string
  time: string
  host: {
    name: string
    avatar: string
  }
  zoomLink: string
}

export interface LiveClassesSectionProps {
  upcomingClasses: LiveClass[]
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
}

export function LiveClassesSection({
  upcomingClasses,
  isSectionExpanded,
  toggleSection
}: LiveClassesSectionProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.3 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 h-full" data-tour="live-classes">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("classes")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-brand-pink/10 rounded-full p-2">
              <Calendar className="h-5 w-5 text-brand-pink" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Live Classes</h2>
          </div>
          {isSectionExpanded("classes") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("classes") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-brand-pink/10 rounded-full p-2">
                  <Calendar className="h-5 w-5 text-brand-pink" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Live Classes</h2>
              </div>
             
            </div>

            <div className="space-y-4">
              {upcomingClasses.length > 0 ? (
                upcomingClasses.map((liveClass) => (
                  <div
                    key={liveClass.id}
                    className="p-4 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow"
                  >
                    <h4 className="font-medium text-[#5d4037] mb-2">{liveClass.title}</h4>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-[#6d4c41]">
                        <p>{liveClass.date}</p>
                        <p>{liveClass.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={liveClass.host.avatar} alt={liveClass.host.name} />
                          <AvatarFallback>{liveClass.host.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-[#6d4c41]">{liveClass.host.name}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full bg-brand-pink hover:bg-brand-pink/90"
                      onClick={() => {
                        // Default to the Facebook community page if no specific link is provided
                        const communityUrl = liveClass.zoomLink && liveClass.zoomLink !== '#' 
                          ? liveClass.zoomLink 
                          : 'https://www.facebook.com/groups/gracefulhomeschoolingplus';
                        window.open(communityUrl, '_blank');
                      }}
                    >
                      Join Community
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No upcoming classes</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}
