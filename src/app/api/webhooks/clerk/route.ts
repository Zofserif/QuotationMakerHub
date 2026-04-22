export async function POST() {
  return Response.json({
    received: true,
    handledEvents: [
      "organization.created",
      "organization.updated",
      "organizationMembership.created",
      "organizationMembership.updated",
      "organizationMembership.deleted",
      "user.deleted",
    ],
  });
}
