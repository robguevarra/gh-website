# Task Objective
Reactivate `app/_specialsale` as a landing page for the new "Teacher Gift Set" product, replace copy, assets, pricing, and CTAs, while preserving the lead capture + payment intent flow. Ensure page design fits current brand and is responsive.

# Current State Assessment
- Page existed for a previous product (Pillow Talk commercial license).
- Lead capture endpoint `/api/leads/capture` and `createPublicSalePaymentIntent` are already wired.
- New assets are available in `public/Teacher Gift Set/`.
- Delivery link is hosted on Google Drive (to be emailed post‑purchase).

# Future State Goal
- A polished, mobile‑first landing page for "Teacher Gift Set" at `/_specialsale` with:
  - Updated images (gallery from `public/Teacher Gift Set/`)
  - New copy and features list
  - Price set to ₱100
  - Lead capture + payment flow unchanged
  - Metadata/SEO updated

# Implementation Plan
1. Update content in `app/_specialsale/page.tsx`
   - [x] Replace product details (id, name, copy, price, images, features)
   - [x] Adjust CTAs, banner, and info sections for Teacher Gift Set
   - [x] Keep lead capture + payment logic; update metadata keys (utm, product_code)
2. Assets
   - [x] Use images from `public/Teacher Gift Set/`
3. Delivery/Email
   - [ ] Ensure post‑purchase email template includes the Drive link below
   - Drive folder: `https://drive.google.com/drive/folders/1YmU-6znwqG0fL6mkOZ2NCpjxx-hfRfEf`
4. QA & Test
   - [ ] Validate image paths render on local/dev
   - [ ] Test lead capture network call success
   - [ ] Test payment intent creation and redirect to invoice
   - [ ] Mobile layout smoke test

# Notes / Decisions
- Timer now uses a rolling 7‑day expiry for urgency text.
- Pricing shown as ₱100 vs crossed out ₱150 (configurable in `productDetails`).
- Kept design structure; refined copy to match new offer and deliverables.

# Changelog
- 2025‑08‑11: Initial reactivation and content update completed. Added this Build Notes file. 

# Delivery Link & Email
- Template used: `Pillow Talk License Delivery` (generic layout already provisioned)
- New product case added in `lib/webhooks/public-sale-handler.ts` with product code `teacher_gift_set`
- Drive link variable: `process.env.TEACHER_GIFT_SET_DRIVE_LINK` (falls back to the provided folder)
- Tagging: maps to `Teacher Gift Set Purchase` 

# Email Template Design
- Cloned `design` JSONB from `Pillow Talk License Delivery` → `Teacher Gift Set Delivery` (ID: ba9f1490-19c1-4991-84d0-a6df79bf981c)
- Replaced product text to "Teacher Gift Set" and updated CTA link to the Drive folder
- Verified:
  - Contains "Teacher Gift Set" text in design JSON
  - Uses target Drive link in design JSON 