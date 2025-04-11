# Platform Integration - Phase 2-1: Course Management Foundation

## Task Objective
Establish the foundational data structures and APIs for a unified course management system in the Graceful Homeschooling platform.

## Current State Assessment
The platform requires a robust foundation for course management that will support:
- Unified course editing experience
- Real-time collaboration
- Rich content management
- Media handling

## Future State Goal
A solid foundation for course management that enables:

1. **Efficient Data Structure**:
   - Optimized database schema for courses, modules, and lessons
   - Support for rich content and media assets
   - Real-time capabilities through Supabase

2. **Comprehensive API Layer**:
   - RESTful endpoints for all course operations
   - Real-time subscriptions for collaborative features
   - Secure media handling endpoints

3. **Type Safety**:
   - Complete TypeScript definitions
   - Zod validation schemas
   - Proper error handling

## Implementation Plan

### 1. Database Schema
- [ ] Implement core tables
  ```sql
  -- Courses table
  CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
  );

  -- Modules table
  CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
  );

  -- Lessons table
  CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_json JSONB,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
  );
  ```

### 2. Type Definitions
- [ ] Create TypeScript interfaces
  ```typescript
  // Types for course management
  interface Course {
    id: string;
    title: string;
    slug: string;
    description?: string;
    thumbnailUrl?: string;
    status: 'draft' | 'published' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
  }

  interface Module {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    position: number;
    status: 'draft' | 'published' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }

  interface Lesson {
    id: string;
    moduleId: string;
    title: string;
    contentJson?: Record<string, unknown>;
    position: number;
    status: 'draft' | 'published' | 'archived';
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

### 3. API Implementation
- [ ] Create API routes
  ```typescript
  // API route structure
  app/
    api/
      courses/
        route.ts               # GET, POST
        [courseId]/
          route.ts            # GET, PATCH, DELETE
          modules/
            route.ts          # GET, POST
            [moduleId]/
              route.ts        # GET, PATCH, DELETE
              lessons/
                route.ts      # GET, POST
                [lessonId]/
                  route.ts    # GET, PATCH, DELETE
  ```

### 4. Real-time Subscriptions
- [ ] Implement Supabase real-time features
  - [ ] Course updates subscription
  - [ ] Module position changes
  - [ ] Lesson content changes
  - [ ] Collaboration presence

## Technical Considerations

### Performance
- Implement database indexes for frequent queries
- Use optimistic updates for real-time operations
- Cache frequently accessed course data

### Security
- Implement row-level security policies
- Validate all user input
- Secure media upload endpoints

### Scalability
- Design for horizontal scaling
- Implement proper database partitioning
- Plan for high concurrent access

## Next Steps
After establishing this foundation:
1. Implement the unified course editor interface
2. Add rich text editing capabilities
3. Integrate media management
4. Enable real-time collaboration

---

> **Note**: This foundation will support the seamless course editing experience detailed in Phase 2-2. 