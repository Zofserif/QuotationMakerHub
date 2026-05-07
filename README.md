Remote Quote is a Next.js App Router MVP foundation for creating structured quotations, sending secure client signing links, capturing cleaned signature images in the browser, locking accepted quotes, and exporting printable versions.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs in demo mode during local development when the Supabase service-role key is absent. Demo mode keeps quote data in process memory so the create-send-sign-accept flow can be exercised locally without external services. In production, Supabase admin credentials are required and missing persistence config fails loudly instead of falling back to memory.

## Implemented MVP Foundation

- Next.js 16 App Router with TypeScript and TailwindCSS.
- Clerk middleware hooks for protected dashboard and quote APIs.
- Supabase browser, server, and admin client helpers.
- Supabase-backed quote, recipient, version, signature, audit, and PDF export persistence for production.
- Initial SQL migrations for quote, recipient, version, signature, audit, PDF, RLS, private bucket setup, and client email uniqueness.
- Structured quote editor with line items, terms, notes, totals, required client signature field, and preview.
- Demo route handlers for local development fallback when Supabase admin credentials are not configured.
- Browser signature modal with camera, upload, and draw modes plus canvas background removal.
- PostHog client/server helpers that avoid sending sensitive quote text.

## Important Production Work Still Required

- Add email sending through Resend or another provider.
- Replace the placeholder PDF bytes with Playwright Chromium rendering.
- Add rate limiting, MIME sniffing, image dimension validation, RLS tests, and E2E coverage.

## Database

Run the SQL files in `src/db/migrations/` against Supabase in order to create the schema, RLS policies, private storage buckets, and client uniqueness constraint.

## Environment

Copy `.env.example` to `.env.local` and fill in Clerk, Supabase, PostHog, and email credentials when moving out of demo mode. Production requires:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET` for verified Clerk organization/member webhooks
- `NEXT_PUBLIC_APP_URL` set to the production origin, such as `https://remotequote.example` until the final domain is configured
- `NEXT_PUBLIC_UPGRADE_CONTACT_EMAIL` for the manual partner-upgrade mail link
- `NEXT_PUBLIC_COFFEE_DONATION_URL` for the dashboard coffee donation link
- `NTFY_SUPPORT_TOPIC_URL` for active partner customer support notifications
- `NEXT_PUBLIC_DASHBOARD_TUTORIAL_URL` for the Quote dashboard tutorial video
- `NEXT_PUBLIC_QUOTE_TEMPLATE_TUTORIAL_URL` for the Quote Template tutorial video
- `NEXT_PUBLIC_LINE_ITEM_DATA_TUTORIAL_URL` for the Line Item Data tutorial video
- `NEXT_PUBLIC_NEW_QUOTE_TUTORIAL_URL` for the New Quote tutorial video
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Paid plan renewal dates are read from Clerk private metadata at
`remoteQuote.renewsAt` as an ISO date string, alongside the existing
`remoteQuote.plan` value. When a Monthly or Yearly Partner renewal date is in
the past, the workspace is treated like an ended Free Trial until the metadata
is renewed.

Yearly Partner workspaces can enable team access through Clerk Organizations.
The user who converts a personal yearly workspace becomes the local team owner;
invited Clerk organization members share the same quote dashboard even if their
personal workspace is Free Trial or Monthly Partner.

## Hydration Warning Troubleshooting

If you see a hydration mismatch warning showing attributes like `data-lt-installed` on `<html>`, this is usually caused by a browser extension (commonly LanguageTool) modifying the DOM before React hydration.

Use this isolation workflow:

- Re-test in an Incognito/Private window with extensions disabled.
- Or disable the extension for `localhost` and refresh.
- Keep strict hydration checks enabled by default; only suppress root hydration warnings as a last resort.
