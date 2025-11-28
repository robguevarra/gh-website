# Task Objective
Refresh the visual design of admin dashboard metric cards to a polished, Webby-level aesthetic without changing data logic. Focus on clarity, hierarchy, accessibility, and subtle micro-interactions.

# Current State Assessment
- Cards are implemented via `components/admin/metric-card.tsx` and used in:
  - `components/admin/dashboard-overview.tsx`
  - `components/admin/enrollments-section.tsx`
  - `components/admin/revenue-section.tsx`
- Present features:
  - Title, icon (right), prominent value, small description.
  - Minimal hover (`hover:shadow-md`), no focus ring, no states (loading uses generic skeletons outside the card), no delta/sparkline.
- Visual issues:
  - Hierarchy can be improved (title vs value vs description).
  - Icon container lacks consistent intent color system.
  - Hover/focus feedback is subtle and not accessible enough.
  - No optional micro-trend or delta indicator to add context.

# Future State Goal
- Metric cards with clear hierarchy, consistent intents (revenue/enrollment/orders/default), accessible contrast, and tasteful micro-interactions.
- Optional delta chip and sparkline support when data is available, but safe defaults when omitted.
- Dedicated skeleton that mirrors layout.

# Implementation Plan (Phase 1 – Visual Refresh)
1) Foundations in `MetricCard` (drop-in, no data changes)
   - Add props: `intent`, `delta?`, `trend?`, `isLoading?`, `onClick?` (optional).
   - Visual: refined padding, radius, soft gradient/overlay, subtle border, tuned shadow.
   - Icon container with intent-tinted background and ring.
   - Typography: uppercase label, tabular-nums value, muted description.
   - States: hover, focus-visible, pressed; respect `prefers-reduced-motion`.

2) Skeletons
   - Create `components/admin/metric-card-skeleton.tsx` to match final layout.
   - Replace generic `Skeleton` usages for metric grids with this skeleton.

3) Integration per section (no data model changes)
   - DashboardOverview: tag intents per metric type; keep current values/desc; no delta for now.
   - EnrollmentsSection: same; use skeleton during load.
   - RevenueSection: same; use skeleton during load.

4) Accessibility + Theming
   - Ensure contrast (WCAG AA: 4.5:1 text, 3:1 UI/non-text).
   - Non-color cues for positive/negative delta (arrow, label).
   - Validate light/dark theme parity.

5) Performance
   - CSS-only micro-interactions; GPU-friendly transforms.
   - Avoid new heavy libs; micro-sparkline via inline SVG (optional, data-gated).

# QA Checklist
- Visual hierarchy correct on mobile/desktop.
- Card hover/focus visible with keyboard.
- Contrast passes WebAIM checker.
- Reduced motion respected.
- No layout shift when switching loading → loaded (skeleton mirrors layout).

# Notes / Decisions
- Phase 1 will not introduce new data fetching for deltas/trends. Props will be optional and safe by default.
- Phase 2 (optional) can wire deltas and trend arrays when metrics are available.

## Visual Accents (Phase 1.1) – 2025-09-11
- Added optional `accent` prop to `MetricCard` with curated palette: indigo, violet, emerald, teal, cyan, sky, blue, amber, rose, fuchsia.
- Implemented a subtle top accent bar derived from `accent` (or falls back to `intent`).
- Applied accents:
  - `dashboard-overview.tsx`: Total Revenue→indigo, Enrollees→sky, Canva→violet, Shopify→amber, Public Sale→teal.
  - `enrollments-section.tsx`: Enrolled Today→sky, Enrolled This Month/Period→emerald.
  - `revenue-section.tsx`: P2P→emerald, Canva→violet, Shopify→amber, Public Sale→teal.
- Rationale: tasteful variety without harming readability; accents are limited to top bar and icon pill with strong contrast.
