# Platform Integration - Phase 2-2-1: Dashboard Refactoring

## Task Objective

Refactor the monolithic `app/dashboard2/page.tsx` file into smaller, more maintainable components that follow project standards, ensuring proper code modularity, type safety, and adherence to the 150-line file limit guideline.

## Current State Assessment

The student dashboard (`app/dashboard2/page.tsx`) is currently implemented as a large, monolithic component exceeding 950 lines of code. While some components have already been extracted (StudentHeader, GoogleDriveViewer, TemplateBrowser, TemplatePreviewModal), several key UI sections remain directly embedded in the main file. This approach:

- Hinders maintainability due to the file's excessive length
- Makes code reuse difficult across different parts of the application
- Complicates testing of individual dashboard features
- Creates potential for state management issues
- Reduces code readability and increases cognitive load

Some progress has been made with the extraction of:
- `StudentHeader` component
- `GoogleDriveViewer` component
- `TemplateBrowser` and `TemplatePreviewModal` components
- `OnboardingTour` component
- `WelcomeModal` component

However, many critical sections remain embedded in the main file, including:
- Course progress section
- Purchases section
- Live classes section
- Support section
- Community section

## Future State Goal

A modular, maintainable student dashboard with:

1. **Component-Based Architecture**
   - Each logical section of the dashboard extracted into its own component
   - No single file exceeding 150 lines of code
   - Clear separation of concerns between components

2. **Strongly-Typed Interface**
   - Proper TypeScript interfaces for all component props
   - Consistent error and loading state handling
   - Type-safe data flow between components

3. **Optimized Performance**
   - Minimized re-renders through proper state isolation
   - Optimized data fetching with proper caching strategies
   - Lazy-loaded components where appropriate

4. **Enhanced Testability**
   - Isolated components that can be unit tested independently
   - Clear input/output boundaries for each component
   - Reduced side effects through functional programming principles

## Implementation Plan

### 1. Analyze and Plan Component Extraction

- [x] Identify already extracted components
  - `StudentHeader` in `/components/dashboard/student-header.tsx`
  - `GoogleDriveViewer` in `/components/dashboard/google-drive-viewer.tsx`
  - `TemplateBrowser` in `/components/dashboard/template-browser.tsx`
  - `TemplatePreviewModal` in `/components/dashboard/template-preview-modal.tsx`
  - `OnboardingTour` in `/components/dashboard/onboarding-tour.tsx`
  - `WelcomeModal` in `/components/dashboard/welcome-modal.tsx`

- [x] Identify remaining sections requiring extraction
  - [x] Map out component dependencies
  - [x] Define data flow between components
  - [x] Document shared state requirements

### 2. Extract Remaining Components

- [x] Extract `CourseProgressSection` component
  - [x] Define props interface with proper types
  - [x] Implement loading and error states
  - [x] Integrate progress calculation utilities
  - [x] Ensure responsive design for mobile

- [x] Extract `PurchasesSection` component
  - [x] Create placeholder with mock data structure
  - [x] Prepare for future Shopify integration
  - [x] Implement skeleton loaders for async data

- [x] Extract `LiveClassesSection` component
  - [x] Create calendar view component
  - [x] Implement upcoming class notifications
  - [x] Add Zoom integration placeholders

- [x] Extract `SupportSection` component
  - [x] Implement help resources display
  - [x] Create contact form or support ticket interface
  - [x] Add FAQ accordion component

- [x] Extract `CommunitySection` component
  - [x] Create social media integration components
  - [x] Implement community announcement display
  - [x] Add forum or discussion board preview

- [x] Extract `TemplatesLibrarySection` component
  - [x] Integrate with existing TemplateBrowser component
  - [x] Implement section toggle for mobile view
  - [x] Add View All Templates link

### 3. Implement State Management

- [x] Review and refine existing Zustand store implementation
  - [x] Audit current state usage in dashboard components
  - [x] Identify opportunities for state normalization
  - [x] Document state management patterns

- [x] Implement proper state isolation
  - [x] Ensure components only subscribe to needed state
  - [x] Implement selectors for optimized renders
  - [x] Add proper cleanup for subscriptions

### 4. Update Main Dashboard Page

- [x] Refactor `dashboard2/page.tsx` to use extracted components
  - [x] Remove duplicate code
  - [x] Implement proper prop passing
  - [x] Ensure responsive layout is maintained

- [x] Implement proper error boundaries
  - [x] Add fallback UI for component failures
  - [x] Create reusable ErrorBoundary component
  - [x] Fix data structure mismatches between mock data and component interfaces
  - [x] Implement error logging with environment awareness (dev vs. production)
  - [x] Ensure graceful degradation with user-friendly error messages

### 5. State Management Refinement

- [x] Optimize state management
  - [x] Create optimized Zustand selectors via custom hooks
  - [x] Implement proper state isolation to prevent unnecessary re-renders
  - [x] Add proper TypeScript typings for state slices
  - [x] Add cleanup and default values to prevent undefined errors
  - [x] Implement performance monitoring for development mode
  - [x] Fix infinite render loop issues in Zustand selectors
  - [x] Implement atomic selectors to prevent unnecessary re-renders
  - [x] Add shallow equality checking for optimized state comparison
  - [x] Stabilize component references to prevent excessive renders

### 6. Testing and Optimization

- [ ] Create unit tests for extracted components
  - [ ] Test component rendering
  - [ ] Test interactive features
  - [ ] Verify error boundary behavior

### 7. Integration with Enrollment System

- [ ] Prepare dashboard components for real API integration
  - [ ] Update mock data loaders to use Supabase client
  - [ ] Implement proper loading states for data fetching
  - [ ] Create fallback UI for enrollment-specific components
  
- [ ] Connect with enrollment system (Phase 2-2)
  - [ ] Integrate with user_enrollments table
  - [ ] Implement course progress tracking
  - [ ] Connect template library with purchase verification
  - [ ] Add real-time data synchronization for progress updates

## Relevant Context

### From Project Context

From the `ProjectContext.md`, the following key points inform our refactoring approach:

- **Technical Foundation**: Next.js 15 with TypeScript, TailwindCSS, and Shadcn UI
- **State Management**: React hooks for local state, Zustand for more complex client-side state
- **Code Quality**: Emphasis on maintainable, concise code with strong typing

### From Design Context

From the `designContext.md`, these design principles apply:

- **Typography**: Clear hierarchical structure with Inter for body text and Playfair Display for headings
- **Component Patterns**: Consistent styling for cards, buttons, forms, and navigation
- **Animation Principles**: Subtle animations that enhance rather than distract from content

### From User Preferences

Key principles that will guide our refactoring:

- Files limited to a maximum of 150 lines
- Functional, declarative programming (avoiding OOP and classes)
- DRY (Don't Repeat Yourself) principles
- Mobile-first responsive design patterns
- Strongly typed TypeScript implementations
