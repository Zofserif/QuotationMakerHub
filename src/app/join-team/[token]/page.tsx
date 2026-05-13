import { notFound } from "next/navigation";

import { JoinTeamCard } from "@/components/team/join-team-card";
import { LinkButton } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/auth/clerk";
import { getTeamJoinLinkPreview } from "@/lib/team/join-links";

export const dynamic = "force-dynamic";

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isClerkConfigured()) {
    return (
      <JoinTeamShell>
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-stone-950">
            Team links unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Clerk must be configured before team links can be used.
          </p>
          <LinkButton className="mt-5" href="/dashboard" variant="secondary">
            Back to dashboard
          </LinkButton>
        </section>
      </JoinTeamShell>
    );
  }

  const { auth } = await import("@clerk/nextjs/server");
  await auth.protect();

  const { token } = await params;
  const preview = await getTeamJoinLinkPreview(token);

  if (!preview) {
    notFound();
  }

  return (
    <JoinTeamShell>
      <JoinTeamCard organization={preview.organization} token={token} />
    </JoinTeamShell>
  );
}

function JoinTeamShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      {children}
    </main>
  );
}
