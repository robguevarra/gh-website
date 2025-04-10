"use client"

import { Users, Facebook, ChevronDown, ChevronUp, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

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
}

export function CommunitySection({
  communityPosts = [],
  isSectionExpanded,
  toggleSection,
  onJoinGroup
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
      // Default behavior
      window.open('https://www.facebook.com/groups/paperproductsgroup', '_blank')
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.5 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
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
              <Link
                href="/dashboard/community"
                className="text-[#1877F2] hover:underline text-sm flex items-center"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#1877F2]/5 to-[#1877F2]/10 rounded-lg p-5 border border-[#1877F2]/10 flex items-center gap-4">
                <div className="bg-[#1877F2] rounded-full p-3">
                  <Facebook className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[#5d4037]">Join Our Facebook Community</h3>
                  <p className="text-sm text-[#6d4c41]">
                    Connect with other students, share your progress, and get inspired!
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <h3 className="font-medium text-[#5d4037] mb-3">Community Highlights</h3>
                <div className="space-y-3">
                  {communityPosts.length > 0 ? (
                    communityPosts.map((post) => (
                      <div key={post.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{post.user.name}</div>
                          <p className="text-xs text-[#6d4c41] line-clamp-1">
                            {post.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg?height=40&width=40&text=EP" alt="Emily Parker" />
                          <AvatarFallback>EP</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">Emily Parker</div>
                          <p className="text-xs text-[#6d4c41] line-clamp-1">
                            Just made my first sale on Etsy! Thank you Grace for all your guidance!
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg?height=40&width=40&text=MT" alt="Michael Thompson" />
                          <AvatarFallback>MT</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">Michael Thompson</div>
                          <p className="text-xs text-[#6d4c41] line-clamp-1">
                            Anyone have tips for shipping internationally? I just got my first order from Canada!
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Button 
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90"
                onClick={handleJoinGroup}
              >
                <Facebook className="h-4 w-4 mr-2" />
                Join Facebook Group
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t text-center md:hidden">
              <Link
                href="/dashboard/community"
                className="text-[#1877F2] hover:underline text-sm flex items-center justify-center"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
