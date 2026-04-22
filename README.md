Quotation Maker Hub is a Next.js App Router MVP foundation for creating structured quotations, sending secure client signing links, capturing cleaned signature images in the browser, locking accepted quotes, and exporting printable versions.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs in demo mode when Clerk and Supabase credentials are absent. Demo mode keeps quote data in process memory so the create-send-sign-accept flow can be exercised locally without external services.

## Implemented MVP Foundation

- Next.js 16 App Router with TypeScript and TailwindCSS.
- Clerk middleware hooks for protected dashboard and quote APIs.
- Supabase browser, server, and admin client helpers.
- Initial SQL migration for quote, recipient, version, signature, audit, PDF, RLS, and private bucket setup.
- Structured quote editor with line items, terms, notes, totals, required client signature field, and preview.
- Demo route handlers for create, save draft, send, client quote view, signature placement, acceptance locking, and PDF export metadata.
- Browser signature modal with camera, upload, and draw modes plus canvas background removal.
- PostHog client/server helpers that avoid sending sensitive quote text.

## Important Production Work Still Required

- Replace the demo in-memory store with Supabase-backed repositories.
- Finish Clerk webhook verification and organization/member synchronization.
- Add email sending through Resend or another provider.
- Replace the placeholder PDF bytes with Playwright Chromium rendering and private Supabase Storage writes.
- Add rate limiting, MIME sniffing, image dimension validation, RLS tests, and E2E coverage.

## Database

Run `src/db/migrations/0001_initial_schema.sql` against Supabase to create the schema, RLS policies, and private storage buckets.

## Environment

Copy `.env.example` to `.env.local` and fill in Clerk, Supabase, PostHog, and email credentials when moving out of demo mode.
