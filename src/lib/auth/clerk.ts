export const dashboardRoutes = [
  "/dashboard(.*)",
  "/quotes(.*)",
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
