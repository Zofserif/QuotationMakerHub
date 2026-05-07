import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import {
  deleteClerkOrganizationMembership,
  deleteUserMemberships,
  syncClerkOrganization,
  syncClerkOrganizationMembership,
} from "@/lib/team/supabase";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (event.type) {
    case "organization.created":
    case "organization.updated":
      await syncClerkOrganization({
        workspaceRef: event.data.id,
        name: "name" in event.data ? event.data.name : "Clerk Organization",
      });
      break;
    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const membership = parseMembershipEventData(event.data);

      if (membership) {
        await syncClerkOrganizationMembership(membership);
      }
      break;
    }
    case "organizationMembership.deleted": {
      const membership = parseMembershipEventData(event.data);

      if (membership) {
        await deleteClerkOrganizationMembership({
          workspaceRef: membership.workspaceRef,
          clerkUserId: membership.clerkUserId,
        });
      }
      break;
    }
    case "user.deleted":
      if ("id" in event.data && event.data.id) {
        await deleteUserMemberships(event.data.id);
      }
      break;
    default:
      break;
  }

  return Response.json({ received: true, handledEvent: event.type });
}

function parseMembershipEventData(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as {
    organization?: { id?: unknown; name?: unknown };
    public_user_data?: { user_id?: unknown };
    role?: unknown;
  };
  const workspaceRef = record.organization?.id;
  const workspaceName = record.organization?.name;
  const clerkUserId = record.public_user_data?.user_id;

  if (
    typeof workspaceRef !== "string" ||
    typeof workspaceName !== "string" ||
    typeof clerkUserId !== "string"
  ) {
    return null;
  }

  return {
    workspaceRef,
    workspaceName,
    clerkUserId,
    clerkOrgRole: typeof record.role === "string" ? record.role : undefined,
  };
}
