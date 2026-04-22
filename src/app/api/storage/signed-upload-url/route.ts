import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";

export async function POST() {
  await requireQuoter();

  return errorResponse(
    "STORAGE_NOT_CONFIGURED",
    "Signed upload URLs require Supabase storage credentials.",
    501,
  );
}
