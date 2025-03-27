# Course Editor Enhancement - Phase 2: Kajabi-like Features

## Task Objective
Enhance the course editor with professional-grade functionality similar to Kajabi while maintaining Next.js 15+ best practices and proper handling of dynamic APIs.

## Current State Assessment
Our course editor currently has:
- Basic course editing with server-side rendering using Next.js 15+
- Supabase integration with proper dynamic API handling
- TipTap editor integration for basic content editing
- Simple module/lesson management structure
- Server Components with proper client/server separation
- Route handlers with cookie-based authentication

Technical implementation details:
```typescript
// Server-side Supabase client with proper dynamic API handling
const supabase = await createServerSupabaseClient()
const { data: course } = await supabase.from('courses').select('*')

// Route handler with proper cookie management
const cookieStore = await cookies()
const client = await createRouteHandlerClient()
```

## Future State Goal
A professional-grade course editor that:
1. Matches or exceeds Kajabi's functionality
2. Maintains Next.js 15+ best practices and performance
3. Properly handles all dynamic APIs and server/client components
4. Provides real-time collaboration and autosaving
5. Offers advanced content management capabilities

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes (Phase 1-0 through Phase 1-6)
> 2. Project context (`ProjectContext.md`)
> 3. Design context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context
From the `ProjectContext.md`, the following key points inform our course editor approach:
- **Architecture**: Next.js 15+ with App Router and React Server Components
- **Database**: Supabase with proper RLS and dynamic API handling
- **State Management**: Zustand for client-side state
- **UI Components**: Shadcn UI with consistent styling

### From Previously Completed Phases
The project has established:
- **Database Schema**: Courses, modules, and lessons tables in Supabase
- **Authentication**: Cookie-based auth with proper dynamic API handling
- **Base Editor**: Initial TipTap integration
- **Component Structure**: Proper server/client component separation

### Current Technical Implementation
Key technical aspects currently in place:

1. **Server Components**:
```typescript
// Proper dynamic params handling in Next.js 15+
interface CoursePageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const supabase = await createServerSupabaseClient()
  // ...
}
```

2. **Route Handlers**:
```typescript
export const createRouteHandlerClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        // ...
      }
    }
  )
}
```

## Implementation Plan

### 1. Dynamic API and Server Component Optimization
- [ ] Update all route handlers for proper cookie handling
  - Implement async cookie access
  - Add proper error handling
  - Ensure type safety
- [ ] Optimize server components
  - Add proper dynamic params handling
  - Implement streaming where appropriate
  - Add proper error boundaries

### 2. Enhanced UI/UX Layout
- [ ] Implement multi-pane layout
  - Left: Course structure tree (client component)
  - Center: Content editor (client component)
  - Right: Live preview (server component)
- [ ] Add collapsible panels
- [ ] Implement responsive design
- [ ] Add keyboard shortcuts

### 3. Course Structure Management
- [ ] Enhanced drag-and-drop
  - Vertical reordering
  - Cross-section dragging
  - Real-time Supabase sync
- [ ] Bulk operations
  - Multi-select functionality
  - Batch updates with proper error handling
- [ ] Quick edit capabilities
  - Inline editing
  - Context menus
  - Real-time validation

### 4. Advanced Content Editor
- [ ] Enhanced TipTap integration
  - Custom extensions
  - Table support
  - Code blocks
- [ ] Content blocks system
  - Video blocks
  - Quiz blocks
  - Assignment blocks
- [ ] Media management
  - Supabase storage integration
  - Image optimization
  - File management

### 5. Real-time Features
- [ ] Auto-save functionality
  - Supabase real-time subscriptions
  - Optimistic updates
  - Version history
- [ ] Collaborative editing
  - Presence indicators
  - Change tracking
  - Comments system

### 6. Course Settings & Analytics
- [ ] Advanced settings
  - Access control
  - Prerequisites
  - Completion rules
- [ ] Analytics integration
  - Progress tracking
  - Engagement metrics
  - Performance monitoring

## Technical Considerations

### Next.js 15+ Compliance
- Proper handling of dynamic APIs
- Correct server/client component separation
- Streaming and suspense boundaries

### Database Operations
- Optimistic updates for better UX
- Proper error handling
- Real-time subscriptions
- RLS policies

### Performance
- Lazy loading for large courses
- Proper state management
- Strategic caching
- Bundle optimization

## Dependencies
- TipTap and extensions
- React DnD
- Supabase client
- Analytics tools
- Media processing libraries

## Migration Strategy
1. Update dynamic API handling first
2. Implement features incrementally
3. Use feature flags for rollout
4. Maintain backward compatibility

## Success Metrics
- Editor load time < 2s
- Auto-save latency < 500ms
- Preview update time < 100ms
- Zero dynamic API warnings
- Proper TypeScript coverage

## Completion Status
Currently in progress:
- ✅ Dynamic API fixes implemented
- ✅ Basic course editor structure in place
- ✅ Initial TipTap integration complete
- ✅ Enhanced TipTap editor with tables, code blocks, and custom blocks
- ✅ Media management with Supabase storage integration
- ✅ Real-time autosave functionality
- ✅ Advanced toolbar with formatting controls

Challenges addressed:
- ✅ Resolved Next.js 15+ dynamic API warnings
- ✅ Implemented proper cookie handling
- ✅ Fixed server component issues
- ✅ Implemented proper file upload and management
- ✅ Added real-time content saving

Pending:
- Real-time collaboration
- Analytics integration
- Course settings implementation
- Enhanced drag-and-drop functionality
- Bulk operations for modules/lessons

## Next Steps
1. Implement real-time collaboration features:
   - User presence indicators
   - Concurrent editing
   - Change tracking
   - Comments system

2. Add analytics integration:
   - Progress tracking
   - Engagement metrics
   - Performance monitoring

3. Enhance course structure management:
   - Improved drag-and-drop
   - Bulk operations
   - Quick edit capabilities

4. Implement course settings:
   - Access control
   - Prerequisites
   - Completion rules

5. Move to Phase 2-3: Course Delivery System

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Properly handle all dynamic APIs in Next.js 15+
> 3. Maintain strict separation between server and client components
> 4. Follow the established folder structure and naming conventions
> 5. Implement proper error handling and type safety
> 6. Use appropriate Supabase client based on context (server/client/route handler)
> 7. Include this reminder in all future build notes to maintain consistency 