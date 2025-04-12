"use client"

import Link from "next/link"
import { Download, ChevronDown, ChevronUp, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { TemplateBrowser } from "@/components/dashboard/template-browser"
import type { DriveItem } from '@/lib/google-drive/driveApiUtils';
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"

export interface TemplatesLibrarySectionProps {
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
  onTemplateSelect?: (file: DriveItem) => void
  isPreviewOpen?: boolean
  setIsPreviewOpen?: (isOpen: boolean) => void
}

export function TemplatesLibrarySection({
  isSectionExpanded,
  toggleSection,
  onTemplateSelect,
  isPreviewOpen,
  setIsPreviewOpen
}: TemplatesLibrarySectionProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const handleTemplateSelect = (file: DriveItem) => {
    if (onTemplateSelect) {
      onTemplateSelect(file)
    }
    
    if (setIsPreviewOpen) {
      setIsPreviewOpen(true)
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.1 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("templates")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-brand-blue/10 rounded-full p-2">
              <Download className="h-5 w-5 text-brand-blue" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Free Templates</h2>
          </div>
          {isSectionExpanded("templates") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("templates") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-brand-blue/10 rounded-full p-2">
                  <Download className="h-5 w-5 text-brand-blue" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Free Templates</h2>
              </div>
              <Link
                href="/dashboard/templates"
                className="text-brand-blue hover:underline text-sm flex items-center"
              >
                View All Templates
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {/* Integrated Template Browser Component */}
            <TemplateBrowser onTemplateSelect={handleTemplateSelect} />
            
            <div className="mt-4 pt-4 border-t text-center md:hidden">
              <Link
                href="/dashboard/templates"
                className="text-brand-blue hover:underline text-sm flex items-center justify-center"
              >
                View All Templates
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
