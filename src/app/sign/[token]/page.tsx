import { notFound } from "next/navigation";

import { ClientQuoteViewComponent } from "@/components/signature/client-quote-view";
import { getClientQuoteView } from "@/lib/quotes/persistence";

export default async function SignQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ signature?: string | string[] }>;
}) {
  const { token } = await params;
  const { signature } = await searchParams;
  const view = await getClientQuoteView(token);

  if (!view) {
    notFound();
  }

  const signatureParam =
    typeof signature === "string" ? signature : signature?.[0];
  const initialSignatureFieldId =
    signatureParam &&
    view.requiredSignatureFields.some((field) => field.id === signatureParam)
      ? signatureParam
      : null;

  return (
    <ClientQuoteViewComponent
      token={token}
      initialView={view}
      initialSignatureFieldId={initialSignatureFieldId}
    />
  );
}
