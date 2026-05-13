/**
 * prisma/add-departments.ts
 *
 * Inserts only the NEW Nuanu departments (not the 8 that already exist in
 * the original seed). Safe to re-run — uses upsert by `code`.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/add-departments.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const departments: Array<{ name: string; code: string; description: string }> = [
    // ── Core Divisions ────────────────────────────────────────────────────────
    { name: "Arts & Culture",                  code: "ARTS",     description: "Visual arts, cultural programs and creative expression" },
    { name: "Education",                        code: "EDU",      description: "Learning programs, workshops and educational initiatives" },
    { name: "Wellness",                         code: "WELL",     description: "Health, wellness and holistic lifestyle services" },
    { name: "Experiential Activities & Events", code: "EXP",      description: "Curated experiences, activities and event programming" },
    { name: "Nature & Sustainability",          code: "NAT",      description: "Environmental stewardship and nature-based programs" },
    { name: "Technology & Innovation",          code: "TECH",     description: "Digital innovation, tech platforms and R&D" },
    { name: "Hospitality & Accommodation",      code: "HOSP",     description: "Guest accommodation and hospitality services" },
    { name: "Community & Social Impact",        code: "COMM",     description: "Community engagement and social responsibility" },
    { name: "Business & Investment",            code: "BIZ",      description: "Business development, investment and commercial strategy" },

    // ── HR / Recruitment sub-departments ─────────────────────────────────────
    { name: "Talent Acquisition",              code: "TACQ",     description: "End-to-end recruitment and talent sourcing" },
    { name: "Organization Development",        code: "ORGDEV",   description: "Organizational design, culture and capability building" },
    { name: "HR Operations",                   code: "HROP",     description: "HR administration, payroll and employee lifecycle" },

    // ── Engineering & Facilities ─────────────────────────────────────────────
    { name: "MEP",                             code: "MEP",      description: "Mechanical, electrical and plumbing engineering" },
    { name: "Building Maintenance",            code: "BLDMNT",   description: "Facility upkeep, repairs and preventive maintenance" },
    { name: "Infrastructure",                  code: "INFRA",    description: "Civil infrastructure, roads and site development" },
    { name: "Site Engineering",                code: "SITEENG",  description: "On-site engineering oversight and project execution" },
    { name: "Utilities",                       code: "UTIL",     description: "Power, water and utility management" },

    // ── Operations ───────────────────────────────────────────────────────────
    { name: "Site Operations",                 code: "SITEOP",   description: "Day-to-day site management and coordination" },
    { name: "Guest Operations",                code: "GUESTOP",  description: "Guest-facing operational services and support" },
    { name: "Event Operations",                code: "EVTOP",    description: "Logistics and execution of events on-site" },
    { name: "Tourism Operations",              code: "TOUROP",   description: "Tourism services, excursions and travel coordination" },

    // ── Sales & Marketing ────────────────────────────────────────────────────
    { name: "Sales",                           code: "SALES",    description: "Direct sales, lead generation and revenue growth" },
    { name: "Partnerships",                    code: "PARTNER",  description: "Strategic alliances, sponsors and partner relations" },
    { name: "Branding",                        code: "BRAND",    description: "Brand identity, positioning and visual guidelines" },
    { name: "Event Sales",                     code: "EVTSLS",   description: "Sales and commercialisation of event packages" },
    { name: "Digital Marketing",               code: "DGTMKT",   description: "Online marketing, SEO, social media and analytics" },

    // ── Finance & Accounting ─────────────────────────────────────────────────
    { name: "Accounting",                      code: "ACCT",     description: "Financial accounting, reporting and compliance" },
    { name: "Budgeting",                       code: "BUDGET",   description: "Budget planning, forecasting and financial control" },

    // ── IT / Product / Technology ────────────────────────────────────────────
    { name: "Products Management",             code: "PRODMGMT", description: "Product roadmap ownership and stakeholder alignment" },
    { name: "Systems Analyst",                 code: "SYSANAL",  description: "Business systems analysis and process improvement" },
    { name: "UX Research",                     code: "UXRES",    description: "User research, usability testing and insights" },
    { name: "Platform Development",            code: "PLATDEV",  description: "Core platform engineering and API development" },
    { name: "Internal Systems",                code: "INTSYS",   description: "ERP, HRIS, and internal tooling management" },

    // ── Creative & Media ─────────────────────────────────────────────────────
    { name: "Creative Production",             code: "CRPROD",   description: "Creative concepts, campaigns and production" },
    { name: "Content Production",              code: "CONTPROD", description: "Written, audio and digital content creation" },
    { name: "Multimedia",                      code: "MEDIA",    description: "Multimedia design, motion graphics and animation" },
    { name: "Photography & Video",             code: "PHOTOVID", description: "Photography, videography and post-production" },
    { name: "Art Direction",                   code: "ARTDIR",   description: "Visual art direction for campaigns and experiences" },

    // ── Safety & Medical ─────────────────────────────────────────────────────
    { name: "Emergency Response",              code: "EMGR",     description: "Emergency planning, response and crisis management" },
    { name: "Site Nurse",                      code: "NURSE",    description: "On-site nursing and primary healthcare services" },
    { name: "Health & Safety (HSE/K3)",        code: "HSE",      description: "Occupational health, safety and environmental compliance" },

    // ── Hospitality & F&B ────────────────────────────────────────────────────
    { name: "Restaurant Operations",           code: "RESTOP",   description: "F&B outlet management and dining experience" },
    { name: "Kitchen",                         code: "KITCHEN",  description: "Culinary operations and kitchen management" },
    { name: "Chef Team",                       code: "CHEF",     description: "Executive and line chef team" },
    { name: "Accommodation",                   code: "ACCOMM",   description: "Villa and room management and guest accommodation" },
    { name: "Guest Experience",                code: "GUESTEXP", description: "End-to-end guest journey and satisfaction" },

    // ── Events & Entertainment ───────────────────────────────────────────────
    { name: "Event Management",                code: "EVTMGMT",  description: "Planning, coordination and delivery of events" },
    { name: "Music & Festivals",               code: "MUSIC",    description: "Music programming, festivals and live entertainment" },
    { name: "Exhibition Management",           code: "EXHIB",    description: "Art exhibitions, installations and gallery curation" },
    { name: "Community Events",                code: "COMMEVT",  description: "Local community gatherings and engagement events" },

    // ── Sustainability & Environment ─────────────────────────────────────────
    { name: "Waste Management",                code: "WASTE",    description: "Waste reduction, recycling and zero-waste initiatives" },
    { name: "Reforestation",                   code: "REFOR",    description: "Tree planting, forest restoration and land rehabilitation" },
    { name: "Mangrove Conservation",           code: "MANGR",    description: "Mangrove ecosystem protection and restoration" },
    { name: "Biodiversity Programs",           code: "BIODIV",   description: "Species conservation and biodiversity monitoring" },
  ];

  console.log(`\nInserting ${departments.length} new departments...\n`);

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: {
        name: dept.name,
        code: dept.code,
        description: dept.description,
        budget: 0,
        isActive: true,
      },
    });
    console.log(`  checkmark ${dept.name} (${dept.code})`);
  }

  console.log("\nDone! All departments inserted/updated.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
