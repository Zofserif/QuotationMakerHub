export const localWorkspaceRoles = ["owner", "admin", "quoter"] as const;

export type LocalWorkspaceRole = (typeof localWorkspaceRoles)[number];

export function isPersonalWorkspaceRef(workspaceRef: string) {
  return workspaceRef.startsWith("personal:");
}

export function personalWorkspaceRef(clerkUserId: string) {
  return `personal:${clerkUserId}`;
}

export function localWorkspaceRoleForClerkOrgRole(
  orgRole?: string | null,
): LocalWorkspaceRole {
  return orgRole === "org:admin" ? "admin" : "quoter";
}

export function parseLocalWorkspaceRole(
  value: unknown,
): LocalWorkspaceRole | undefined {
  return localWorkspaceRoles.includes(value as LocalWorkspaceRole)
    ? (value as LocalWorkspaceRole)
    : undefined;
}
