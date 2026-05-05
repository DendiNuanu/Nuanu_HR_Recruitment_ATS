import { getSession } from "./auth";

export type Role = "admin" | "hr" | "recruiter" | "interviewer" | "finance" | "manager";

export async function checkRole(allowedRoles: Role[]) {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  // Check if any of the user's roles match the allowed roles
  // We assume roles in session are slugs (lowercase)
  const hasRole = session.roles.some(role => 
    allowedRoles.includes(role.toLowerCase() as Role) || 
    role.toLowerCase() === "super-admin" ||
    role.toLowerCase() === "admin"
  );

  if (!hasRole) {
    throw new Error(`Unauthorized: Required role [${allowedRoles.join(", ")}] not found`);
  }

  return session;
}
