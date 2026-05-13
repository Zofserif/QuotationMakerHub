import { LinkButton } from "@/components/ui/button";

export default function TeamJoinLinkNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-stone-950">
          Team link unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          This team join link is invalid or no longer active.
        </p>
        <LinkButton className="mt-5" href="/dashboard" variant="secondary">
          Back to dashboard
        </LinkButton>
      </section>
    </main>
  );
}
