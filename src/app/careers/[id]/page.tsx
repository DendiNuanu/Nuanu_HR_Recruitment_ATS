import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Briefcase, MapPin, ArrowLeft, Building, Calendar } from "lucide-react";
import Link from "next/link";
import ApplicationForm from "./ApplicationForm";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = await prisma.vacancy.findUnique({
    where: { id },
    include: { department: true },
  });

  if (!job || job.status !== "published") {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EFF3F8', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="bg-nuanu-navy relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/15 to-transparent blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
        </div>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 40px' }} className="relative z-10">
          <Link 
            href="/careers" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500, marginBottom: '24px', textDecoration: 'none' }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} /> Back to all positions
          </Link>
          
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>{job.title}</h1>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building style={{ width: '15px', height: '15px', color: '#10B981' }} /> {job.department?.name || "General"}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin style={{ width: '15px', height: '15px', color: '#10B981' }} /> {job.location || "Remote"}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase style={{ width: '15px', height: '15px', color: '#10B981' }} /> {job.employmentType || "Full-Time"}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar style={{ width: '15px', height: '15px', color: '#10B981' }} /> Posted {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Content & Form — responsive stacking */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px 0' }}>
        {/* Description sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          <section style={{ background: '#FFFFFF', padding: 'clamp(20px, 4vw, 32px)', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0A1628', marginBottom: '16px' }}>About the Role</h2>
            <div style={{ color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '15px' }}>
              {job.description}
            </div>
          </section>

          {job.requirements && (
            <section style={{ background: '#FFFFFF', padding: 'clamp(20px, 4vw, 32px)', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0A1628', marginBottom: '16px' }}>Requirements</h2>
              <div style={{ color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '15px' }}>
                {job.requirements}
              </div>
            </section>
          )}
        </div>

        {/* Application Form — full width on all screens */}
        <div style={{ background: '#FFFFFF', padding: 'clamp(20px, 4vw, 32px)', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxWidth: '500px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0A1628', marginBottom: '4px' }}>Apply for this position</h3>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>Fill in your details below to apply.</p>
          <ApplicationForm jobId={job.id} />
        </div>
      </main>
    </div>
  );
}
