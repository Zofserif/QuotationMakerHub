import { errorResponse } from "@/lib/api/responses";
import { requireQuoter } from "@/lib/auth/require-quoter";
import {
  joinTeamWithLink,
  TeamJoinLinkError,
} from "@/lib/team/join-links";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const quoter = await requireQuoter();
  const { token } = await params;
  const result = await joinTeamWithLink({
    token,
    clerkUserId: quoter.clerkUserId,
  }).catch(toTeamJoinResponse);

  if (result instanceof Response) {
    return result;
  }

  return Response.json(result);
}

function toTeamJoinResponse(error: unknown) {
  if (error instanceof TeamJoinLinkError) {
    return errorResponse(error.code, error.message, error.status);
  }

  return errorResponse(
    "TEAM_JOIN_FAILED",
    "Team membership could not be created.",
    500,
  );
}
