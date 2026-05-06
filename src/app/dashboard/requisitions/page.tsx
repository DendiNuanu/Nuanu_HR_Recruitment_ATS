import { checkRole } from "@/lib/rbac";
import RequisitionsClient from "./RequisitionsClient";
import { prisma } from "@/lib/prisma";

export default async function RequisitionsPage() {
  // Protect page and get session
  const session = await checkRole(["admin", "hr", "recruiter", "finance", "manager"]);

  // Fetch departments for the requisition form
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8">
      <RequisitionsClient initialUser={session} departments={departments} />
    </div>
  );
}
