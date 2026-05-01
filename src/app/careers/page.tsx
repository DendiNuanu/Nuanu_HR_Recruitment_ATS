import { prisma } from "@/lib/prisma";
import { Briefcase, MapPin, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function CareersPage() {
  const vacancies = await prisma.vacancy.findMany({
    where: { status: "published" },
    include: { department: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ minHeight: '100vh', background: '#EFF3F8' }}>
      {/* Hero Header */}
      <header className="bg-nuanu-navy relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/15 to-transparent blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/10 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3"></div>
        </div>
        
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '80px 24px' }} className="relative z-10">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Image
              src="/nuanu-logo.png"
              alt="Nuanu"
              width={72}
              height={72}
              className="rounded-2xl"
              style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.3)', marginBottom: '32px' }}
            />
            <h1 className="text-nuanu-white" style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              Join Our Team
            </h1>
            <p className="text-nuanu-emerald" style={{ fontSize: '18px', maxWidth: '540px', opacity: 0.8, lineHeight: 1.6 }}>
              We are looking for the best talent to build a better future together
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '32px', color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase style={{ width: '16px', height: '16px' }} /> {vacancies.length} Open Positions
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin style={{ width: '16px', height: '16px' }} /> Remote & On-site
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Job Listings */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0A1628' }}>Open Positions</h2>
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{vacancies.length} roles</span>
        </div>

        {vacancies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Briefcase style={{ width: '56px', height: '56px', color: '#CBD5E1', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0A1628' }}>No open positions right now</h3>
            <p style={{ color: '#64748B', marginTop: '8px' }}>Check back later for new opportunities.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {vacancies.map((job) => (
              <Link 
                key={job.id} 
                href={`/careers/${job.id}`}
                style={{ display: 'block', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textDecoration: 'none', transition: 'all 0.2s' }}
              >
                <div style={{ padding: '24px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0A1628', marginBottom: '12px' }}>
                        {job.title}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', background: '#F1F5F9', padding: '6px 14px', borderRadius: '8px' }}>
                          <Briefcase style={{ width: '14px', height: '14px', color: '#94A3B8' }} /> {job.department?.name || "General"}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', background: '#F1F5F9', padding: '6px 14px', borderRadius: '8px' }}>
                          <MapPin style={{ width: '14px', height: '14px', color: '#94A3B8' }} /> {job.location || "Remote"}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', background: '#F1F5F9', padding: '6px 14px', borderRadius: '8px' }}>
                          <Clock style={{ width: '14px', height: '14px', color: '#94A3B8' }} /> {job.employmentType || "Full-Time"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>
                      Apply Now <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', borderTop: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '14px', color: '#94A3B8' }}>&copy; {new Date().getFullYear()} Nuanu &middot; Enterprise HR Platform</p>
      </footer>
    </div>
  );
}
