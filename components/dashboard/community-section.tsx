"use client"
import Link from "next/link"
import { Heart, MessageSquare, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface CommunityUpdate {
  id: number
  user: {
    name: string
    avatar: string
  }
  content: string
  likes: number
  comments: number
  time: string
}

interface CommunitySectionProps {
  updates: CommunityUpdate[]
}

export function CommunitySection({ updates }: CommunitySectionProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Community</CardTitle>
        <Link href="/dashboard/community" className="text-sm text-brand-purple hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={update.user.avatar} alt={update.user.name} />
                <AvatarFallback>{update.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{update.user.name}</div>
                <div className="text-xs text-muted-foreground">{update.time}</div>
              </div>
            </div>

            <p className="text-sm">{update.content}</p>

            <div className="flex items-center gap-4 pt-2">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Heart className="h-3 w-3" />
                {update.likes}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <MessageSquare className="h-3 w-3" />
                {update.comments}
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-2">
          <Button className="w-full bg-brand-purple hover:bg-brand-purple/90">
            <Users className="h-4 w-4 mr-2" />
            Join the Discussion
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
