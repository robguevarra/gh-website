"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  MessageSquare, 
  Heart, 
  Reply, 
  MoreHorizontal,
  ThumbsUp,
  AlertCircle
} from "lucide-react"
import { getBrowserClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface Comment {
  id: string
  user_id: string
  lesson_id: string
  content: string
  created_at: string
  updated_at: string
  likes_count: number
  user: {
    name: string
    avatar_url: string
  }
  is_liked_by_user?: boolean
  replies?: Comment[]
}

interface LessonCommentsProps {
  lessonId: string
}

export function LessonComments({ lessonId }: LessonCommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  
  // Load comments from database
  useEffect(() => {
    if (!lessonId) return
    
    const loadComments = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const supabase = getBrowserClient()
        
        // Get comments for this lesson
        const { data, error } = await supabase
          .from("lesson_comments")
          .select(`
            *,
            user:user_id (
              name,
              avatar_url
            ),
            replies:lesson_comment_replies (
              *,
              user:user_id (
                name,
                avatar_url
              )
            )
          `)
          .eq("lesson_id", lessonId)
          .eq("is_reply", false)
          .order("created_at", { ascending: false })
        
        if (error) throw error
        
        // Get likes for current user
        let userLikes: any[] = []
        if (user?.id) {
          const { data: likesData } = await supabase
            .from("lesson_comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
          
          userLikes = likesData || []
        }
        
        // Mark comments liked by user
        const commentsWithLikes = data?.map(comment => ({
          ...comment,
          is_liked_by_user: userLikes.some(like => like.comment_id === comment.id),
          replies: comment.replies?.map(reply => ({
            ...reply,
            is_liked_by_user: userLikes.some(like => like.comment_id === reply.id)
          }))
        })) || []
        
        setComments(commentsWithLikes)
      } catch (err) {
        console.error("Error loading comments:", err)
        setError("Failed to load comments. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadComments()
  }, [lessonId, user?.id])
  
  // Submit a new comment
  const submitComment = async () => {
    if (!user?.id || !lessonId || !newComment.trim()) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase
        .from("lesson_comments")
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          content: newComment.trim(),
          is_reply: false
        })
        .select(`
          *,
          user:user_id (
            name,
            avatar_url
          )
        `)
        .single()
      
      if (error) throw error
      
      // Add new comment to list
      setComments(prev => [
        {
          ...data,
          likes_count: 0,
          is_liked_by_user: false,
          replies: []
        },
        ...prev
      ])
      
      // Clear input
      setNewComment("")
    } catch (err) {
      console.error("Error submitting comment:", err)
      setError("Failed to submit comment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Submit a reply to a comment
  const submitReply = async () => {
    if (!user?.id || !lessonId || !replyingTo || !replyContent.trim()) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase
        .from("lesson_comments")
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          content: replyContent.trim(),
          is_reply: true,
          parent_id: replyingTo
        })
        .select(`
          *,
          user:user_id (
            name,
            avatar_url
          )
        `)
        .single()
      
      if (error) throw error
      
      // Add reply to parent comment
      setComments(prev => prev.map(comment => {
        if (comment.id === replyingTo) {
          return {
            ...comment,
            replies: [
              ...(comment.replies || []),
              {
                ...data,
                likes_count: 0,
                is_liked_by_user: false
              }
            ]
          }
        }
        return comment
      }))
      
      // Clear reply state
      setReplyingTo(null)
      setReplyContent("")
    } catch (err) {
      console.error("Error submitting reply:", err)
      setError("Failed to submit reply. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Like or unlike a comment
  const toggleLike = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (!user?.id) return
    
    try {
      const supabase = getBrowserClient()
      
      // Check if user already liked this comment
      const { data: existingLike } = await supabase
        .from("lesson_comment_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("comment_id", commentId)
        .single()
      
      if (existingLike) {
        // Unlike
        await supabase
          .from("lesson_comment_likes")
          .delete()
          .eq("id", existingLike.id)
        
        // Update UI
        if (isReply && parentId) {
          setComments(prev => prev.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: comment.replies?.map(reply => {
                  if (reply.id === commentId) {
                    return {
                      ...reply,
                      likes_count: Math.max(0, reply.likes_count - 1),
                      is_liked_by_user: false
                    }
                  }
                  return reply
                })
              }
            }
            return comment
          }))
        } else {
          setComments(prev => prev.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes_count: Math.max(0, comment.likes_count - 1),
                is_liked_by_user: false
              }
            }
            return comment
          }))
        }
      } else {
        // Like
        await supabase
          .from("lesson_comment_likes")
          .insert({
            user_id: user.id,
            comment_id: commentId
          })
        
        // Update UI
        if (isReply && parentId) {
          setComments(prev => prev.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: comment.replies?.map(reply => {
                  if (reply.id === commentId) {
                    return {
                      ...reply,
                      likes_count: reply.likes_count + 1,
                      is_liked_by_user: true
                    }
                  }
                  return reply
                })
              }
            }
            return comment
          }))
        } else {
          setComments(prev => prev.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes_count: comment.likes_count + 1,
                is_liked_by_user: true
              }
            }
            return comment
          }))
        }
      }
    } catch (err) {
      console.error("Error toggling like:", err)
    }
  }
  
  // Delete a comment
  const deleteComment = async (commentId: string, isReply: boolean = false, parentId?: string) => {
    if (!user?.id) return
    
    try {
      const supabase = getBrowserClient()
      
      await supabase
        .from("lesson_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id)
      
      // Update UI
      if (isReply && parentId) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies?.filter(reply => reply.id !== commentId)
            }
          }
          return comment
        }))
      } else {
        setComments(prev => prev.filter(comment => comment.id !== commentId))
      }
    } catch (err) {
      console.error("Error deleting comment:", err)
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (err) {
      return "some time ago"
    }
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-[#5d4037]">Discussion</h3>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#5d4037]">Discussion</h3>
        <span className="text-sm text-[#6d4c41]">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* New comment form */}
      {user && (
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Share your thoughts or ask a question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            
            <div className="flex justify-end">
              <Button
                onClick={submitComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Comments list */}
      <div className="space-y-6 pt-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-[#5d4037] mb-1">No Comments Yet</h3>
            <p className="text-sm text-[#6d4c41]">
              Be the first to share your thoughts on this lesson!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              {/* Main comment */}
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.user?.avatar_url} />
                  <AvatarFallback>
                    {comment.user?.name?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[#5d4037]">{comment.user?.name}</h4>
                      <p className="text-xs text-[#6d4c41]">{formatDate(comment.created_at)}</p>
                    </div>
                    
                    {user?.id === comment.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 cursor-pointer"
                            onClick={() => deleteComment(comment.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="mt-2 text-[#5d4037]">
                    {comment.content}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => toggleLike(comment.id)}
                    >
                      {comment.is_liked_by_user ? (
                        <ThumbsUp className="h-4 w-4 fill-brand-purple text-brand-purple" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      {comment.likes_count > 0 && (
                        <span>{comment.likes_count}</span>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="flex gap-4 pl-14">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder={`Reply to ${comment.user?.name}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent("")
                        }}
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={submitReply}
                        disabled={isSubmitting || !replyContent.trim()}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-14 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.user?.avatar_url} />
                        <AvatarFallback>
                          {reply.user?.name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-[#5d4037]">{reply.user?.name}</h4>
                            <p className="text-xs text-[#6d4c41]">{formatDate(reply.created_at)}</p>
                          </div>
                          
                          {user?.id === reply.user_id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-red-600 cursor-pointer"
                                  onClick={() => deleteComment(reply.id, true, comment.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        <div className="mt-2 text-[#5d4037]">
                          {reply.content}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => toggleLike(reply.id, true, comment.id)}
                          >
                            {reply.is_liked_by_user ? (
                              <ThumbsUp className="h-4 w-4 fill-brand-purple text-brand-purple" />
                            ) : (
                              <ThumbsUp className="h-4 w-4" />
                            )}
                            {reply.likes_count > 0 && (
                              <span>{reply.likes_count}</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
