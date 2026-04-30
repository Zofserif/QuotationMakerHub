export const dashboardRoutes = [
  "/dashboard(.*)",
  "/line-item-data(.*)",
  "/quote-template(.*)",
  "/quotes(.*)",
  "/api/dashboard(.*)",
  "/api/line-item-data(.*)",
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
