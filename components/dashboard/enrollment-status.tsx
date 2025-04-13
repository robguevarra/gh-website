'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, AlertTriangle, Lock } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfile } from '@/lib/hooks/use-user-profile'
import * as enrollmentAccess from '@/lib/supabase/enrollment-access'

/**
 * Component to display a user's enrollment status for a specific course
 * Also verifies access control for the course content
 */
export function EnrollmentStatus() {
  const { courseId } = useParams<{ courseId: string }>()
  const { userId } = useUserProfile()
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    isEnrolled: boolean;
    status: string;
    expiresAt: string | null;
    message: string;
    courseTitle?: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    async function checkEnrollment() {
      if (!userId || !courseId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setHasError(false)

        // Check if the user is enrolled in this course
        const enrollment = await enrollmentAccess.verifyUserCourseEnrollment({
          userId,
          courseId: Array.isArray(courseId) ? courseId[0] : courseId
        })

        if (enrollment) {
          setEnrollmentStatus({
            isEnrolled: true,
            status: enrollment.status,
            expiresAt: enrollment.expires_at,
            message: 'You are enrolled in this course',
            courseTitle: enrollment.course?.title
          })
        } else {
          setEnrollmentStatus({
            isEnrolled: false,
            status: 'not-enrolled',
            expiresAt: null,
            message: 'You are not enrolled in this course'
          })
        }
      } catch (error) {
        console.error('Error checking enrollment status:', error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkEnrollment()
  }, [userId, courseId])

  if (isLoading) {
    return <EnrollmentStatusSkeleton />
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          We couldn't verify your enrollment status. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (!enrollmentStatus) {
    return null
  }

  if (!enrollmentStatus.isEnrolled) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-800 mb-1">Course Not Accessible</h3>
              <p className="text-sm text-amber-700">
                You are not enrolled in this course. Purchase this course to access all its content.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Link href="/courses" passHref>
            <Button variant="ghost" size="sm">Browse Courses</Button>
          </Link>
          <Link href={`/courses/${courseId}/purchase`} passHref>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Enroll Now</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // User is enrolled, display status based on enrollment status
  if (enrollmentStatus.status === 'active') {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-800 mb-1">Fully Enrolled</h3>
              <p className="text-sm text-green-700">
                You have full access to all content in {enrollmentStatus.courseTitle || 'this course'}.
                {enrollmentStatus.expiresAt && (
                  <> Your enrollment expires on {new Date(enrollmentStatus.expiresAt).toLocaleDateString()}.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (enrollmentStatus.status === 'pending') {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Enrollment Pending</h3>
              <p className="text-sm text-blue-700">
                Your enrollment is being processed. This may take a few minutes.
                Please check back soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (enrollmentStatus.status === 'expired') {
    return (
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-orange-800 mb-1">Enrollment Expired</h3>
              <p className="text-sm text-orange-700">
                Your enrollment has expired. Please renew to regain access to the course materials.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Link href={`/courses/${courseId}/purchase`} passHref>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">Renew Enrollment</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Default card for other statuses
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gray-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Enrollment Status: {enrollmentStatus.status}</h3>
            <p className="text-sm text-muted-foreground">
              {enrollmentStatus.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EnrollmentStatusSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-24 ml-auto" />
      </CardFooter>
    </Card>
  )
}
