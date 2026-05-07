import { prisma } from "@/lib/prisma";
import { Briefcase, MapPin, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";

const getPublishedVacancies = unstable_cache(
  async () =>
    prisma.vacancy.findMany({
      where: { status: "published" },
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["careers-vacancies"],
  { revalidate: 120, tags: ["vacancies"] },
);

export default async function CareersPage() {
  const vacancies = await getPublishedVacancies();

  return (
    <div style={{ minHeight: "100vh", background: "#EFF3F8" }}>
      {/* Hero Header */}
      <header className="relative h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://www.nuanu.com/_next/image?url=https%3A%2F%2Fadmin.cockpit.nuanu.com%2Fassets%2F0aa79909-46c6-4e29-a2ec-7bde786960ab.webp&w=1920&q=75"
            alt="Nuanu Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nuanu-navy/80 via-nuanu-navy/70 to-nuanu-navy/90"></div>
        </div>

        <div
          style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}
          className="relative z-10 w-full"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div className="mb-8 p-3 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
              <Image
                src="/nuanu-logo.png"
                alt="Nuanu"
                width={72}
                height={72}
                className="rounded-2xl"
              />
            </div>
            <h1
              className="text-nuanu-white leading-tight"
              style={{
                fontSize: "56px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                marginBottom: "16px",
                textShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              Join Our Team
            </h1>
            <p
              className="text-nuanu-emerald font-semibold"
              style={{
                fontSize: "20px",
                maxWidth: "600px",
                lineHeight: 1.6,
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              We are looking for the best talent to build a better future
              together
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                marginTop: "40px",
                color: "rgba(255,255,255,0.7)",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <Briefcase style={{ width: "18px", height: "18px" }} />{" "}
                {vacancies.length} Open Positions
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <MapPin style={{ width: "18px", height: "18px" }} /> Remote &
                On-site
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Job Listings */}
      <main
        style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 24px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0A1628" }}>
            Open Positions
          </h2>
          <span style={{ fontSize: "14px", color: "#64748B", fontWeight: 500 }}>
            {vacancies.length} roles
          </span>
        </div>

        {vacancies.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              background: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Briefcase
              style={{
                width: "56px",
                height: "56px",
                color: "#CBD5E1",
                margin: "0 auto 16px",
              }}
            />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0A1628" }}>
              No open positions right now
            </h3>
            <p style={{ color: "#64748B", marginTop: "8px" }}>
              Check back later for new opportunities.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {vacancies.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.id}`}
                style={{
                  display: "block",
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ padding: "24px 32px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: "#0A1628",
                          marginBottom: "12px",
                        }}
                      >
                        {job.title}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            color: "#475569",
                            background: "#F1F5F9",
                            padding: "6px 14px",
                            borderRadius: "8px",
                          }}
                        >
                          <Briefcase
                            style={{
                              width: "14px",
                              height: "14px",
                              color: "#94A3B8",
                            }}
                          />{" "}
                          {job.department?.name || "General"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            color: "#475569",
                            background: "#F1F5F9",
                            padding: "6px 14px",
                            borderRadius: "8px",
                          }}
                        >
                          <MapPin
                            style={{
                              width: "14px",
                              height: "14px",
                              color: "#94A3B8",
                            }}
                          />{" "}
                          {job.location || "Remote"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            color: "#475569",
                            background: "#F1F5F9",
                            padding: "6px 14px",
                            borderRadius: "8px",
                          }}
                        >
                          <Clock
                            style={{
                              width: "14px",
                              height: "14px",
                              color: "#94A3B8",
                            }}
                          />{" "}
                          {job.employmentType || "Full-Time"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#10B981",
                        fontWeight: 600,
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      Apply Now{" "}
                      <ChevronRight style={{ width: "16px", height: "16px" }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 24px",
          textAlign: "center",
          borderTop: "1px solid #E2E8F0",
        }}
      >
        <p style={{ fontSize: "14px", color: "#94A3B8" }}>
          &copy; {new Date().getFullYear()} Nuanu &middot; Enterprise HR
          Platform
        </p>
      </footer>
    </div>
  );
}
