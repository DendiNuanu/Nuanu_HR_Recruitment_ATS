import { checkRole } from "@/lib/rbac";
import RequisitionsClient from "./RequisitionsClient";

export default async function RequisitionsPage() {
  // Protect page and get session
  const session = await checkRole(["admin", "hr", "recruiter"]);

  return (
    <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8">
      <RequisitionsClient initialUser={session} />
    </div>
  );
}
