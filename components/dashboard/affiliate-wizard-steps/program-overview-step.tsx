"use client"

import { motion } from "framer-motion"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Clock,
  CheckCircle,
  Smartphone,
  Star
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ApplicationData } from "../affiliate-application-wizard"

interface ProgramOverviewStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function ProgramOverviewStep({ 
  data, 
  updateData, 
  isValid 
}: ProgramOverviewStepProps) {
  const benefits = [
    {
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      title: "Earn 25% Commission",
      description: "As a Course Enrollee, you'll earn 25% commission on every successful referral",
      highlight: "₱250 per Papers to Profits course sold"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
      title: "Growing Market",
      description: "Join the booming homeschooling market with proven educational products",
      highlight: "High demand for quality resources"
    },
    {
      icon: <Award className="h-5 w-5 text-purple-600" />,
      title: "Student Advantage",
      description: "Your personal experience with our courses makes you a credible advocate",
      highlight: "Authentic testimonials convert better"
    },
    {
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      title: "Flexible Schedule",
      description: "Promote when and how you want - fit it around your homeschooling schedule",
      highlight: "Work at your own pace"
    }
  ]

  const features = [
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: "GCash Payouts",
      description: "Fast and convenient payments through GCash every month"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Community Support",
      description: "Join our active affiliate community with ongoing support and training"
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      title: "Marketing Materials",
      description: "Access to professionally designed graphics, templates, and copy"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Transform Your Learning into Earning
        </h3>
        <p className="text-gray-600 text-lg">
          Join thousands of homeschooling families earning income by sharing products they love
        </p>
        <Badge variant="secondary" className="mt-3 bg-green-100 text-green-800">
          Course Enrollee Tier - 25% Commission Rate
        </Badge>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {benefits.map((benefit, index) => (
          <Card key={index} className="border-l-4 border-l-brand-purple">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 rounded-full p-2 mt-1">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {benefit.description}
                  </p>
                  <p className="text-xs font-medium text-brand-purple">
                    {benefit.highlight}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 text-center">
          What You Get as an Affiliate
        </h4>
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="bg-white rounded-full p-2 text-brand-purple">
                {feature.icon}
              </div>
              <div>
                <h5 className="font-medium text-gray-900">
                  {feature.title}
                </h5>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission Structure */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Your Commission Structure
          </h4>
          <div className="text-sm text-green-800 space-y-1">
            <p>• <strong>Course Enrollee Tier:</strong> 25% commission on all sales</p>
            <p>• <strong>Main Product:</strong> Papers to Profits Course (₱1,000.00)</p>
            <p>• <strong>Your Earnings:</strong> ₱250.00 per sale</p>
            <p>• <strong>Minimum Payout:</strong> ₱1,000.00 threshold</p>
            <p>• <strong>Payment Cycle:</strong> Monthly (cutoff: 25th of each month)</p>
          </div>
        </CardContent>
      </Card>

      {/* Payout Schedule */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Monthly Payout Schedule
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Cutoff:</strong> 25th of each month</p>
            <p>• <strong>Processing:</strong> End of month</p>
            <p>• <strong>Minimum:</strong> ₱1,000.00 threshold</p>
            <p>• <strong>Method:</strong> GCash (24-hour processing)</p>
          </div>
        </CardContent>
      </Card>

      {/* Why Join? */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Why Join Our Affiliate Program?
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Share a course you believe in - Papers to Profits helps homeschooling moms</p>
            <p>• High-converting product with proven success stories</p>
            <p>• Comprehensive 8-week course with lifetime access</p>
            <p>• Over 20+ video lessons plus bonus templates worth ₱5,000+</p>
            <p>• Perfect for the homeschooling community you're already part of</p>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-2">
          Ready to Start Earning?
        </h4>
        <p className="text-gray-600 text-sm">
          Continue to review our terms and set up your affiliate account
        </p>
      </div>
    </motion.div>
  )
} 