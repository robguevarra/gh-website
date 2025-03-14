import { getEnv } from "./env"

export interface FacebookPage {
  id: string
  name: string
  followerCount: number
  likesCount: number
  category: string
  profilePicture: string
}

export interface FacebookPost {
  id: string
  message: string
  createdTime: string
  permalink: string
  fullPicture?: string
  likesCount: number
  commentsCount: number
  sharesCount: number
  author: {
    name: string
    avatar: string
  }
}

// Fallback data when API is unavailable
const fallbackPage: FacebookPage = {
  id: "GracefulHomeschoolingbyEmigrace",
  name: "Graceful Homeschooling by Emigrace",
  followerCount: 129000,
  likesCount: 125000,
  category: "Education",
  profilePicture: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png",
}

const fallbackPosts: FacebookPost[] = [
  {
    id: "post1",
    message:
      "I want to take a moment to thank Ms. Emigrace Bacani Guevarra and her incredible team for their humility and generosity in sharing their knowledge with us—strangers—seeking to grow our own small businesses. Your guidance has been such a blessing, and I couldn't have made it this far without your support.",
    createdTime: "2023-11-10T14:30:00Z",
    permalink: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
    likesCount: 347,
    commentsCount: 42,
    sharesCount: 15,
    author: {
      name: "EMJ Alfaro",
      avatar:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials1.jpg-vdiuWnYVM7nV2SaQDk81F9HXwPJVQE.jpeg",
    },
  },
  {
    id: "post2",
    message:
      "One of the most transformative moments in my journey was working with my mentor, Mam Emigrace Guevarra. Late one night, as I struggled with a challenging project, she was there, ready to answer my questions and guide me through it. Her dedication and willingness to help, even in the late hours, deeply touched me. She wasn't just a mentor; she was a guiding light, walking with me through every step of launching my business.",
    createdTime: "2023-10-25T09:15:00Z",
    permalink: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
    fullPicture:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials2-pX2f6lNy6Aa6QnwvxHcosIfvJbB5xu.png",
    likesCount: 523,
    commentsCount: 78,
    sharesCount: 32,
    author: {
      name: "GIE CRAFTY",
      avatar:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials2-pX2f6lNy6Aa6QnwvxHcosIfvJbB5xu.png",
    },
  },
  {
    id: "post3",
    message:
      "yung mga guides actually pag sinagot mo yung mga tanong dun, yung mga sagot na ang printing business plan mo eh! nako nasabi ko tuloy e kung ganyan ba naman ang turo sa amin nung college e di madali daling gumawa ng business plan noon.",
    createdTime: "2023-09-18T16:45:00Z",
    permalink: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
    likesCount: 289,
    commentsCount: 34,
    sharesCount: 8,
    author: {
      name: "LEIGH HER GON",
      avatar:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials3.jpg-WvXqdRpJPDdys6889dNWwP0cRayabK.jpeg",
    },
  },
]

// Format published date to relative time (e.g., "3 weeks ago")
export function formatFacebookDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Get Facebook page info - simplified with direct fallback
export async function getFacebookPage(pageId = "GracefulHomeschoolingbyEmigrace"): Promise<FacebookPage> {
  const accessToken = getEnv("FACEBOOK_ACCESS_TOKEN")

  console.log("Facebook Access Token available:", !!accessToken);
  console.log("Facebook Page ID being used:", pageId);

  // If no token is provided, return fallback data immediately
  if (!accessToken) {
    console.warn("Facebook access token not found, using fallback data");
    return fallbackPage
  }

  try {
    // First try with username
    console.log(`Attempting to fetch Facebook page with ID: ${pageId}`);
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=name,followers_count,fan_count,category,picture.type(large)&access_token=${accessToken}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.warn("Facebook API page fetch failed:", errorData?.error?.message || "Unknown error", 
                  "Status:", response.status, response.statusText);
      
      // If the error is about the page not being found, try with a numeric ID lookup
      if (response.status === 404 || (errorData?.error?.code === 803)) {
        console.log("Page not found with username, trying alternative methods...");
        
        // Try searching for the page instead
        const searchResponse = await fetch(
          `https://graph.facebook.com/v18.0/search?q=${pageId}&type=page&fields=name,id&access_token=${accessToken}`
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            const foundPageId = searchData.data[0].id;
            console.log(`Found page via search with ID: ${foundPageId}`);
            
            // Now fetch the page with the numeric ID
            const pageResponse = await fetch(
              `https://graph.facebook.com/v18.0/${foundPageId}?fields=name,followers_count,fan_count,category,picture.type(large)&access_token=${accessToken}`
            );
            
            if (pageResponse.ok) {
              const data = await pageResponse.json();
              return {
                id: data.id,
                name: data.name,
                followerCount: data.followers_count || 0,
                likesCount: data.fan_count || 0,
                category: data.category || "Education",
                profilePicture: data.picture?.data?.url || fallbackPage.profilePicture,
              };
            }
          }
        }
      }
      
      // If all attempts fail, use fallback
      return fallbackPage
    }

    const data = await response.json()
    console.log("Facebook API response:", data ? "Data received" : "No data");

    return {
      id: data.id,
      name: data.name,
      followerCount: data.followers_count || 0,
      likesCount: data.fan_count || 0,
      category: data.category || "Education",
      profilePicture: data.picture?.data?.url || fallbackPage.profilePicture,
    }
  } catch (error) {
    console.error("Error fetching Facebook page:", error)
    return fallbackPage
  }
}

// Get Facebook posts - simplified with direct fallback
export async function getFacebookPosts(pageId = "GracefulHomeschoolingbyEmigrace", limit = 3): Promise<FacebookPost[]> {
  const accessToken = getEnv("FACEBOOK_ACCESS_TOKEN")

  console.log("Facebook Access Token for posts available:", !!accessToken);
  console.log("Facebook Page ID for posts:", pageId);

  // If no token is provided, return fallback data immediately
  if (!accessToken) {
    console.warn("Facebook access token not found, using fallback data")
    return fallbackPosts
  }

  try {
    // Get page info for author data
    let pageData = {
      name: "Graceful Homeschooling by Emigrace",
      picture: { data: { url: fallbackPage.profilePicture } },
    }

    try {
      console.log("Fetching page data for posts...");
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=name,picture.type(large)&access_token=${accessToken}`,
      )

      if (pageResponse.ok) {
        pageData = await pageResponse.json()
        console.log("Successfully fetched page data for posts");
      } else {
        const errorData = await pageResponse.json();
        console.warn("Failed to fetch page data:", errorData?.error?.message);
      }
    } catch (pageError) {
      console.warn("Could not fetch page data for posts, using fallback", pageError)
    }

    // Get posts
    console.log(`Fetching ${limit} posts from page ${pageId}...`);
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares&limit=${limit}&access_token=${accessToken}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.warn("Facebook API posts fetch failed:", errorData?.error?.message || "Unknown error", 
                  "Status:", response.status, response.statusText);
      return fallbackPosts
    }

    const data = await response.json()
    console.log("Posts API response:", data.data ? `Found ${data.data.length} posts` : "No posts found");

    if (!data.data || data.data.length === 0) {
      console.warn("No Facebook posts found, using fallback data")
      return fallbackPosts
    }

    return data.data.map((post: {
      id: string;
      message?: string;
      created_time: string;
      permalink_url: string;
      full_picture?: string;
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    }) => ({
      id: post.id,
      message: post.message || "No message content",
      createdTime: post.created_time,
      permalink: post.permalink_url,
      fullPicture: post.full_picture,
      likesCount: post.likes?.summary?.total_count || 0,
      commentsCount: post.comments?.summary?.total_count || 0,
      sharesCount: post.shares?.count || 0,
      author: {
        name: pageData.name,
        avatar: pageData.picture?.data?.url || fallbackPage.profilePicture,
      },
    }))
  } catch (error) {
    console.error("Error fetching Facebook posts:", error)
    return fallbackPosts
  }
}

