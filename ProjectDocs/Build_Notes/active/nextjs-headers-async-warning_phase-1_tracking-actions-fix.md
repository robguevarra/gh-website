## Task Objective
Fix the Next.js 15 async headers warning in page view tracking without changing behavior.

## Current State Assessment
`recordPageView` reads request headers synchronously, which triggers Next.js 15 warnings for sync dynamic APIs.

## Future State Goal
`recordPageView` awaits `headers()` before accessing header values, eliminating the warning while preserving the tracking payload.

## Implementation Plan
1. Update server action to await request headers.
   - [x] Await `headers()` in `recordPageView`.
2. Validate behavior and document outcome.
   - [x] Confirm no change to stored payload fields.
   - [ ] Note the warning resolution in completion details.

## Completion Status
### Key Achievements
- Awaited `headers()` before reading values in `recordPageView`.

### Technical Debt Addressed
- Removed Next.js 15 sync dynamic API warning for headers access.

### Pending Items
- Verify warning no longer appears in dev logs.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy, architecture planning, and infrastructure planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
