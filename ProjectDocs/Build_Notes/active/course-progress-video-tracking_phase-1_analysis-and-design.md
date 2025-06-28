# Course Progress & Video Tracking – Phase 1: Analysis and Design

## Task Objective
Provide a reliable, real-time system that accurately records a learner’s progress through each lesson and aggregates course-level progress using Vimeo-hosted video content.

## Current State Assessment
- The dashboard shows static or stale progress percentages.
- `useProgressTracker` exists but is **not used** anywhere; no component starts the timer.
- The hook counts seconds continuously after mount – it is **not tied to the Vimeo player**, producing inaccurate data if the tab remains open.
- No frontend code imports `@vimeo/player`; the embeds are plain iframes, so playback events (`timeupdate`, `pause`, `seeked`) are not captured.
- Backend tables (`user_progress`, `user_time_spent`) and helper functions (`recordTimeSpent`, `getUserTimeSpent`) are present but remain empty.

## Future State Goal
A robust progress-tracking pipeline that:
1. Uses the Vimeo Player SDK to capture actual watch time and position.
2. Updates `user_progress` (percentage & last position) and `user_time_spent` (watch-time segments) via scheduled heartbeats and key events.
3. Immediately reflects changes in the dashboard via Zustand store updates.
4. Prevents over-counting (tab hidden, video paused, duplicated intervals).
5. Scales to other providers with minimal changes.

## Relevant Context
- Supabase schema already has `user_progress`, `user_time_spent`, `course_progress`.
- Hook `useProgressTracker` (lib/hooks/use-student-dashboard.ts) contains save logic but lacks player integration and is unused.
- Video embeds generated across the app use `https://player.vimeo.com/...` iframes without JS control.
- Security headers allow `player.vimeo.com` script execution.

## Implementation Plan
### 1. Front-End Integration
- [ ] Install `@vimeo/player` as a dependency.
- [ ] Create `useVimeoPlayer` hook:
  - Initialise a Vimeo `Player` instance from a ref.
  - Expose `on('timeupdate')`, `on('play')`, `on('pause')`, `on('ended')`, `on('seeked')` handlers.
  - Track *active* playback seconds (only when playing & tab visible).
- [ ] Refactor lesson view component(s) to:
  - Wrap iframe in `div` with `ref` for the player.
  - Call `useProgressTracker` (new version) with callbacks from `useVimeoPlayer`.

### 2. Enhance `useProgressTracker`
- [ ] Accept `currentTime`, `duration`, and `isPlaying` parameters from player hook.
- [ ] Accumulate watch chunks & debounce save (e.g. every 15 s or on `pause`/`ended`).
- [ ] Upsert `user_progress` (progress %, last position, status).
- [ ] Insert `user_time_spent` rows (one per heartbeat).

### 3. Zustand Store Sync
- [ ] Add `updateLessonProgress` & `updateCourseProgress` actions that mutate store after each successful save.
- [ ] Ensure `CourseProgressSection` reacts to store changes without page refresh.

### 4. Backend Safeguards
- [ ] Create Supabase DB trigger to recalculate `course_progress` whenever `user_progress` row changes.
- [ ] Add RLS policies so users can only change rows where `user_id = auth.uid()`.

### 5. QA & Analytics
- [ ] Log errors from failed heartbeats to Sentry.
- [ ] Add analytic events (play, complete) for future insights.

## Technical Considerations
### Player Accuracy
- Use `Page Visibility API` & `IntersectionObserver` to pause counting when the video leaves viewport or tab is hidden.

### Network Efficiency
- Batch updates; avoid saving every second.
- Use optimistic UI updates; roll back on failure.

### Security
- `frame-src` & `script-src` CSP already allow Vimeo; verify no additional relaxations needed.

## Additional Findings – Dashboard Progress Staleness

- **Single refresh only**: `CourseProgressSection` pulls its data once on dashboard load via `loadUserDashboardData()` → `loadUserProgress()`. After a learner watches a lesson, nothing triggers a refresh and there are no realtime subscriptions; the store therefore stays frozen.
- **Two different percentage formulas**: `course_progress` (back-end) averages every lesson’s `progress_percentage`, whereas `CourseProgressSection` fallback logic uses `completedLessons / totalLessons`. When the component flips between data sources, perceived accuracy suffers.
- **Missing lesson-level aggregation**: Lesson pages may update `lessonProgress` for a single lesson, but the store never recomputes `courseProgress` from that delta.
- **Staleness guard too aggressive**: `loadUserProgress()` skips re-fetches triggered within the defined `STALE_THRESHOLD`, blocking manual reloads.
- **Potential DB trigger lag**: If the materialised `course_progress` table updates asynchronously, the UI can lag behind even after a forced fetch.
- **"Mark as complete" flow**: The dedicated button sets a lesson to 100 % on the page itself, but the same issues above prevent the dashboard bar from updating immediately.

### Root-Cause Summary
A. No client-side refresh after progressing through a lesson  
B. Divergent percentage definitions  
C. Store never rebuilds `courseProgress` from fresh `lessonProgress`  
D. Over-zealous re-fetch debounce  
E. Possible server lag when relying on triggers

These gaps will be addressed alongside the video-time tracking work in Phase 2.

## Completion Status
Phase 1 focused on investigation and planning. No code changes committed for tracking yet.

## Next Steps After Completion
Begin Phase 2: **Implementation** – wire up `useVimeoPlayer`, integrate with lesson components, and deploy DB trigger.

---
> **Note to AI Developers**: Review earlier build notes and project context. Maintain functional programming style, keep files ≤ 150 lines, and update build notes incrementally rather than overwriting.

_Last updated: 2025-06-28_
