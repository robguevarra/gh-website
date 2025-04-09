import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white">
      {/* Header */}
      <div className="h-16 border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-32 hidden md:block" />
            <div className="hidden md:flex gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-[200px] rounded-md hidden md:block" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-md hidden md:block" />
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Hero Section */}
        <div className="h-[400px] mb-12">
          <div className="container h-full flex items-center">
            <div className="max-w-2xl">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-12 w-[300px] mb-4" />
              <Skeleton className="h-6 w-[400px] mb-6" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-[150px] rounded-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="container px-4 pb-20">
          {/* Course Content Section */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>

            <Skeleton className="h-[500px] w-full rounded-2xl" />
          </div>

          {/* Downloads Section */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>

            <Skeleton className="h-10 w-[300px] rounded-lg mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[350px] rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Shopify Store Section */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[400px] rounded-2xl" />
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[200px] rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
