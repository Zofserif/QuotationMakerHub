export const dashboardRoutes = [
  "/dashboard(.*)",
  "/quote-template(.*)",
  "/quotes(.*)",
  "/api/quote-template(.*)",
  "/print/quotes(.*)",
  "/api/quotes(.*)",
  "/api/storage(.*)",
];

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}
