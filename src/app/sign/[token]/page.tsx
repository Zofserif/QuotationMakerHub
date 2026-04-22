import { notFound } from "next/navigation";

import { ClientQuoteViewComponent } from "@/components/signature/client-quote-view";
import { getDemoClientQuoteView } from "@/lib/demo/store";

export default async function SignQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = getDemoClientQuoteView(token);

  if (!view) {
    notFound();
  }

  return <ClientQuoteViewComponent token={token} initialView={view} />;
}
