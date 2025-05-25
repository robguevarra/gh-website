import { Suspense } from 'react'
import { Logo } from '@/components/ui/logo'
import { Loader2 } from 'lucide-react'
import MagicLinkVerifyContent from './magic-link-verify-content'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#b08ba5]" />
    </div>
  )
}

export default async function MagicLinkVerifyPage({ params }: PageProps) {
  const { token } = await params
  
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23b08ba5' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-10v-10h-4v10h-10v4h10v10h4v-10h10zM40 0H0v40h40V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        
        {/* Decorative circles */}
        <div className="absolute right-0 top-1/4 w-48 h-48 rounded-full bg-brand-blue/10 blur-3xl opacity-60"></div>
        <div className="absolute left-1/4 bottom-1/4 w-64 h-64 rounded-full bg-brand-pink/10 blur-3xl opacity-40"></div>
        <div className="absolute right-1/3 top-1/2 w-36 h-36 rounded-full bg-brand-purple/10 blur-2xl opacity-50"></div>
      </div>

      {/* Header with Logo */}
      <header className="w-full p-6 z-10 relative">
        <div className="container mx-auto">
          <Logo size="medium" />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 z-10 relative">
        <div className="w-full max-w-md">
          <Suspense fallback={<LoadingSpinner />}>
            <MagicLinkVerifyContent token={token} />
          </Suspense>
        </div>
      </div>
    </div>
  )
} 