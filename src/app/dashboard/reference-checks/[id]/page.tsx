import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MANAGE_ROLE_SLUGS = new Set([
  "admin",
  "super-admin",
  "super_admin",
  "hr",
  "hr_manager",
  "recruiter",
]);

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

function canManage(roles: string[] = []) {
  return roles.some((role) => MANAGE_ROLE_SLUGS.has(role.toLowerCase()));
}

function safe(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

export default async function ReferenceCheckReadOnlyPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session) notFound();

  const { id } = await params;
  const { token } = await searchParams;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: { select: { name: true, email: true } },
      vacancy: { select: { title: true } },
      referenceChecks: {
        orderBy: { referenceNo: "asc" },
        include: { conductor: { select: { name: true } } },
      },
      referenceCheckShare: {
        include: {
          sharedWith: { select: { id: true, name: true, email: true } },
          sharedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!application) notFound();

  const shared = application.referenceCheckShare;
  const allowed =
    canManage(session.roles) ||
    (shared && shared.sharedWith.id === session.id) ||
    (shared && token && shared.shareToken === token);

  if (!allowed) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
          Reference Check Results
        </p>
        <h1 className="mt-2 text-2xl font-bold text-nuanu-navy">
          {application.candidate.name}
        </h1>
        <p className="mt-1 text-sm text-nuanu-gray-500">
          {application.vacancy?.title ?? "Role not specified"}
        </p>

        {shared && (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Shared with {shared.sharedWith.name} by {shared.sharedBy.name} on{" "}
            {formatDateTime(shared.sharedAt)}
          </div>
        )}
      </div>

      {application.referenceChecks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-nuanu-gray-400">
          No completed reference checks are available yet.
        </div>
      ) : (
        application.referenceChecks.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-nuanu-navy">
                  Reference {item.referenceNo}
                </h2>
                <p className="mt-1 text-sm text-nuanu-gray-500">
                  {safe(item.agencyName)}
                </p>
              </div>
              <div className="text-right text-xs text-nuanu-gray-400">
                <p>Updated {formatDateTime(item.updatedAt)}</p>
                <p>By {safe(item.conductor?.name)}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-nuanu-gray-400">
                  Section I — Employment History Verification
                </p>
                <ReadOnlyField
                  label="Agency / Organization"
                  value={item.agencyName}
                />
                <ReadOnlyField label="Telephone" value={item.telephone} />
                <ReadOnlyField label="City / State" value={item.cityState} />
                <ReadOnlyField label="Job Title" value={item.jobTitle} />
                <ReadOnlyField
                  label="Employment Date(s) From"
                  value={item.employmentFrom}
                />
                <ReadOnlyField
                  label="Employment Date(s) To"
                  value={item.employmentTo}
                />
                <ReadOnlyField
                  label="Reason(s) for Leaving"
                  value={item.reasonForLeaving}
                />
                <ReadOnlyField
                  label="Eligible for Rehire"
                  value={item.eligibleForRehire}
                />
                <ReadOnlyField label="Remarks" value={item.rehireRemarks} />
                <ReadOnlyField
                  label="Person Providing Information"
                  value={item.personProvidingInfo}
                />
                <ReadOnlyField label="Title" value={item.personTitle} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-nuanu-gray-400">
                  Section II — Additional Notes (HR Internal)
                </p>
                <ReadOnlyField
                  label="Work Performance"
                  value={item.workPerformance}
                />
                <ReadOnlyField label="Key Strengths" value={item.strengths} />
                <ReadOnlyField
                  label="Areas for Improvement"
                  value={item.areasToImprove}
                />
                <ReadOnlyField
                  label="Additional Notes"
                  value={item.additionalNotes}
                />
                <ReadOnlyField
                  label="Overall Rating"
                  value={item.overallRating ? `${item.overallRating}/5` : "-"}
                />
                <ReadOnlyField
                  label="HR Recommendation"
                  value={item.recommendation}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="border-b border-gray-200 py-2.5 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-nuanu-navy">{safe(value)}</p>
    </div>
  );
}
