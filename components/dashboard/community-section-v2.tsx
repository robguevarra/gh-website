"use client"

import { Users, Facebook, ChevronDown, ChevronUp, ChevronRight, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import Image from "next/image"

export interface CommunityPost {
  id: string
  user: {
    name: string
    avatar: string
  }
  content: string
}

export interface CommunitySectionProps {
  communityPosts: CommunityPost[]
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
  onJoinGroup?: () => void
  facebookGroupUrl?: string
  memberCount?: number
  isLoading?: boolean
}

export function CommunitySection({
  communityPosts = [],
  isSectionExpanded,
  toggleSection,
  onJoinGroup,
  facebookGroupUrl = 'https://www.facebook.com/groups/1081234493223221',
  memberCount,
  isLoading = false
}: CommunitySectionProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const handleJoinGroup = () => {
    if (onJoinGroup) {
      onJoinGroup()
    } else {
      // Default behavior with proper security attributes
      window.open(facebookGroupUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.5 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" data-tour="community">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("community")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-[#1877F2]/10 rounded-full p-2">
              <Users className="h-5 w-5 text-[#1877F2]" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Community</h2>
          </div>
          {isSectionExpanded("community") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("community") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-[#1877F2]/10 rounded-full p-2">
                  <Users className="h-5 w-5 text-[#1877F2]" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Community</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#1877F2]/5 to-[#1877F2]/20 rounded-lg p-5 border border-[#1877F2]/20 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-[#1877F2] rounded-full p-3 shadow-sm">
                    <Facebook className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#5d4037]">Join Our Facebook Community</h3>
                    <p className="text-sm text-[#6d4c41]">
                      Connect with other students, share your progress, and get inspired!
                      {memberCount && <span className="text-[#1877F2] font-medium"> Join {memberCount.toLocaleString()}+ members!</span>}
                    </p>
                  </div>
                </div>
                
                <div className="rounded-lg overflow-hidden border border-[#1877F2]/20 shadow-sm h-32 relative bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image 
                      src="gh-community.png" 
                      alt="Facebook Group Preview" 
                      width={400}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              </div>

              
              <Button 
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 shadow-sm transition-all duration-300 hover:shadow-md py-6"
                onClick={handleJoinGroup}
                size="lg"
              >
                <Facebook className="h-5 w-5 mr-2" />
                <span className="font-medium">Join Our Facebook Community</span>
                <ExternalLink className="h-4 w-4 ml-2 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
