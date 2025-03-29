# Course Editor Technical Context

## Current Implementation

### Architecture Overview
- Next.js 15+ with App Router and Server Components
- Supabase for database and real-time features
- TipTap for rich text editing
- @dnd-kit/core for drag-and-drop functionality

### Key Technical Learnings

1. **Next.js 15 Dynamic APIs**
```typescript
// Route handlers must await dynamic params
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = await params  // Required in Next.js 15
  // ... rest of the handler
}
```

2. **Supabase Integration**
- Server-side queries should use `supabaseAdmin` for RLS bypass
- Client-side should use regular `supabaseClient`
- Cookie handling requires proper async patterns:
```typescript
const cookiesInstance = cookies()
const supabase = createServerActionClient({ cookies: () => cookiesInstance })
```

3. **State Management**
- Course structure in Zustand store
- Real-time updates through Supabase subscriptions
- Optimistic updates for better UX

4. **Component Architecture**
```
/components/admin/courses/course-editor/
├── index.tsx           # Main wrapper
├── module-tree-v2.tsx  # Course structure (new implementation)
├── content-editor.tsx  # Content editing
├── editor.tsx         # TipTap editor
└── editor-toolbar.tsx # Editor controls
```

### Database Schema
```sql
courses
  id
  title
  description
  content_json
  is_published
  metadata
  version
  published_version

modules
  id
  course_id
  title
  description
  content_json
  position
  is_published
  metadata
  version

lessons
  id
  module_id
  title
  description
  content_json
  position
  is_published
  metadata
  version
  status
```

### Critical Considerations

1. **Performance**
- Lazy loading for large courses
- Optimistic updates for immediate feedback
- Proper debouncing for autosave

2. **Error Handling**
- Graceful fallbacks for network issues
- Clear error messages for users
- Proper error boundaries

3. **Type Safety**
- Strict TypeScript implementations
- Proper interface definitions
- Runtime validation with Zod

4. **Security**
- RLS policies for data access
- Admin-only routes
- Proper authentication checks

## Kajabi Analysis

### Core Features

1. **Course Structure**
- Hierarchical organization (Courses > Modules > Lessons)
- Drag-and-drop reordering
- Bulk operations
- Quick inline editing
- Status management (draft/published)

2. **Content Editor**
- Rich text formatting
- Media embedding
- Content blocks
  - Video lessons
  - Quizzes
  - Assignments
  - Downloads
  - Text/HTML
- Version history
- Autosave

3. **Media Management**
- Integrated media library
- Video hosting/streaming
- File attachments
- Image optimization

4. **Preview System**
- Live preview
- Device-specific views (desktop/tablet/mobile)
- Student view

5. **Publishing & Access Control**
- Draft/published states
- Scheduled publishing
- Access restrictions
- Prerequisites

6. **Assessment Tools**
- Quiz builder
- Assignment submissions
- Grading system
- Progress tracking

### UX Patterns

1. **Layout**
- Three-panel design
  - Left: Course structure
  - Center: Content editor
  - Right: Preview/settings
- Collapsible panels
- Full-screen editing

2. **Navigation**
- Breadcrumb navigation
- Quick jump between sections
- Search/filter capabilities
- Recent items

3. **Editing Experience**
- Context menus
- Keyboard shortcuts
- Drag handles
- Status indicators
- Progress tracking

4. **Feedback System**
- Toast notifications
- Progress indicators
- Validation feedback
- Error messages

## Integration Points

1. **With Supabase**
- Real-time updates
- Media storage
- User management
- Access control

2. **With Next.js**
- Server components for static content
- Client components for interactive elements
- API routes for data operations
- Image optimization

3. **With TipTap**
- Custom extensions
- Collaborative editing
- Content validation
- Format conversion

## Known Limitations & Workarounds

1. **Next.js 15 Dynamic APIs**
- Must await dynamic parameters
- Use proper patterns for cookie handling
- Handle client/server component boundaries

2. **Supabase**
- RLS policy management
- Real-time subscription limits
- File storage organization

3. **TipTap**
- Custom extension complexity
- Collaborative editing setup
- Media handling

## Future Considerations

1. **Scalability**
- Handle large courses efficiently
- Optimize media delivery
- Manage collaborative editing

2. **Extensibility**
- Plugin system for content blocks
- Custom assessment types
- Integration with external tools

3. **Performance**
- Optimize initial load time
- Reduce bundle size
- Implement proper caching

4. **Accessibility**
- ARIA labels
- Keyboard navigation
- Screen reader support 