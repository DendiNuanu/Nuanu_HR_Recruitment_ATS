import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Stable IDs ──────────────────────────────────────────────────────────────
// Existing
const ADMIN_ID = "271d4a8a-c87f-4435-9bf4-b479176b8cb0";
const ROLE_SUPER = "26f63c29-4e0e-4862-b363-d033c7c267d4";
const ROLE_RECRUITER = "0df0ce63-3fcf-43c2-b112-6535777295a1";
const DEPT_ENG = "4209964a-6523-42e4-9d63-ed4e7f564e6c";
const DEPT_HR = "1da29226-2bce-474d-8921-094a622f4ec5";
const VAC_SSE = "da750100-92b6-4f5a-bbf6-60821add3c1e"; // Senior Full Stack Engineer
const VAC_PD = "244be0a1-11a2-4375-bf4a-61f909898da5"; // Product Designer

// New departments
const DEPT_EXEC = "00000001-dept-0000-0000-000000000001";
const DEPT_PROD = "00000001-dept-0000-0000-000000000002";
const DEPT_MKT = "00000001-dept-0000-0000-000000000003";
const DEPT_FIN = "00000001-dept-0000-0000-000000000004";
const DEPT_OPS = "00000001-dept-0000-0000-000000000005";
const DEPT_DES = "00000001-dept-0000-0000-000000000006";

// New roles
const ROLE_HR = "00000002-role-0000-0000-000000000001";
const ROLE_INTERVIEWER = "00000002-role-0000-0000-000000000002";
const ROLE_FINANCE = "00000002-role-0000-0000-000000000003";
const ROLE_MANAGER = "00000002-role-0000-0000-000000000004";

// New staff users
const USER_JAMES = "00000003-user-0000-0000-000000000001"; // HR Manager
const USER_MARIA = "00000003-user-0000-0000-000000000002"; // Recruiter
const USER_DAVID = "00000003-user-0000-0000-000000000003"; // Finance
const USER_ALEX = "00000003-user-0000-0000-000000000004"; // Tech Lead / Interviewer
const USER_EMILY = "00000003-user-0000-0000-000000000005"; // Operations Manager

// New vacancies
const VAC_DEVOPS = "00000004-vacn-0000-0000-000000000001";
const VAC_MKTMGR = "00000004-vacn-0000-0000-000000000002";
const VAC_FINANL = "00000004-vacn-0000-0000-000000000003";
const VAC_PRODMGR = "00000004-vacn-0000-0000-000000000004";
const VAC_OPSLEAD = "00000004-vacn-0000-0000-000000000005";
const VAC_DATASCI = "00000004-vacn-0000-0000-000000000006";
const VAC_FEND = "00000004-vacn-0000-0000-000000000007";
const VAC_CONTENT = "00000004-vacn-0000-0000-000000000008";

// Candidate users
const C: Record<number, string> = {};
for (let i = 1; i <= 20; i++) {
  C[i] = `00000005-cand-0000-0000-${String(i).padStart(12, "0")}`;
}

// Applications
const A: Record<number, string> = {};
for (let i = 1; i <= 20; i++) {
  A[i] = `00000006-appl-0000-0000-${String(i).padStart(12, "0")}`;
}

// Scores
const S: Record<number, string> = {};
for (let i = 1; i <= 18; i++) {
  S[i] = `00000007-scor-0000-0000-${String(i).padStart(12, "0")}`;
}

// Interviews
const I: Record<number, string> = {};
for (let i = 1; i <= 8; i++) {
  I[i] = `00000008-intv-0000-0000-${String(i).padStart(12, "0")}`;
}

// Offers
const O: Record<number, string> = {};
for (let i = 1; i <= 4; i++) {
  O[i] = `00000009-offr-0000-0000-${String(i).padStart(12, "0")}`;
}

// Activity Logs
const L: Record<number, string> = {};
for (let i = 1; i <= 10; i++) {
  L[i] = `0000000a-actv-0000-0000-${String(i).padStart(12, "0")}`;
}

// Notifications
const N: Record<number, string> = {};
for (let i = 1; i <= 5; i++) {
  N[i] = `0000000b-notf-0000-0000-${String(i).padStart(12, "0")}`;
}

// Onboarding
const OB: Record<number, string> = {};
for (let i = 1; i <= 6; i++) {
  OB[i] = `0000000c-onbd-0000-0000-${String(i).padStart(12, "0")}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting comprehensive seed...");

  const staffPassword = await bcrypt.hash("nuanu2024", 10);

  // ── 1. Departments ──────────────────────────────────────────────────────────
  console.log("  → Departments");
  const deptData = [
    {
      id: DEPT_ENG,
      name: "Engineering",
      code: "ENG",
      description: "Software development and infrastructure",
      budget: 1200000,
    },
    {
      id: DEPT_HR,
      name: "Human Resources",
      code: "HR",
      description: "Talent acquisition and people management",
      budget: 350000,
    },
    {
      id: DEPT_EXEC,
      name: "Executive",
      code: "EXEC",
      description: "Leadership and strategic direction",
      budget: 500000,
    },
    {
      id: DEPT_PROD,
      name: "Product",
      code: "PROD",
      description: "Product management and roadmap",
      budget: 800000,
    },
    {
      id: DEPT_MKT,
      name: "Marketing",
      code: "MKT",
      description: "Brand, campaigns and growth",
      budget: 450000,
    },
    {
      id: DEPT_FIN,
      name: "Finance",
      code: "FIN",
      description: "Financial planning and analysis",
      budget: 300000,
    },
    {
      id: DEPT_OPS,
      name: "Operations",
      code: "OPS",
      description: "Resort and hospitality operations",
      budget: 600000,
    },
    {
      id: DEPT_DES,
      name: "Design",
      code: "DES",
      description: "UX, brand design and creative",
      budget: 400000,
    },
  ];
  for (const d of deptData) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description, budget: d.budget },
      create: {
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        budget: d.budget,
      },
    });
  }

  // ── 2. Roles ────────────────────────────────────────────────────────────────
  console.log("  → Roles");
  const roleData = [
    { id: ROLE_SUPER, name: "Super Admin", slug: "super-admin" },
    { id: ROLE_RECRUITER, name: "Recruiter", slug: "recruiter" },
    { id: ROLE_HR, name: "HR Manager", slug: "hr" },
    { id: ROLE_INTERVIEWER, name: "Interviewer", slug: "interviewer" },
    { id: ROLE_FINANCE, name: "Finance", slug: "finance" },
    { id: ROLE_MANAGER, name: "Manager", slug: "manager" },
  ];
  for (const r of roleData) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      update: { name: r.name },
      create: { id: r.id, name: r.name, slug: r.slug },
    });
  }

  // ── 3. Staff Users ──────────────────────────────────────────────────────────
  console.log("  → Staff users");
  const staffData = [
    {
      id: ADMIN_ID,
      email: "admin@nuanu.com",
      name: "Super Admin",
      departmentId: DEPT_HR,
      roleId: ROLE_SUPER,
      phone: "+62-811-000-0001",
    },
    {
      id: USER_JAMES,
      email: "hr@nuanu.com",
      name: "James Wilson",
      departmentId: DEPT_HR,
      roleId: ROLE_HR,
      phone: "+62-811-000-0002",
    },
    {
      id: USER_MARIA,
      email: "recruiter@nuanu.com",
      name: "Maria Santos",
      departmentId: DEPT_HR,
      roleId: ROLE_RECRUITER,
      phone: "+62-811-000-0003",
    },
    {
      id: USER_DAVID,
      email: "finance@nuanu.com",
      name: "David Chen",
      departmentId: DEPT_FIN,
      roleId: ROLE_FINANCE,
      phone: "+62-811-000-0004",
    },
    {
      id: USER_ALEX,
      email: "tech@nuanu.com",
      name: "Alex Kumar",
      departmentId: DEPT_ENG,
      roleId: ROLE_INTERVIEWER,
      phone: "+62-811-000-0005",
    },
    {
      id: USER_EMILY,
      email: "manager@nuanu.com",
      name: "Emily Rodriguez",
      departmentId: DEPT_OPS,
      roleId: ROLE_MANAGER,
      phone: "+62-811-000-0006",
    },
  ];
  for (const u of staffData) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          password: staffPassword,
          departmentId: u.departmentId,
          phone: u.phone,
          isActive: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { email: u.email },
        data: { name: u.name, departmentId: u.departmentId, phone: u.phone },
      });
    }
    // Upsert user role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: u.roleId } },
      update: {},
      create: { userId: u.id, roleId: u.roleId },
    });
  }

  // ── 4. Vacancies ────────────────────────────────────────────────────────────
  console.log("  → Vacancies");
  const vacancyData = [
    {
      id: VAC_SSE,
      code: "ENG-001",
      title: "Senior Full Stack Engineer",
      departmentId: DEPT_ENG,
      creatorId: ADMIN_ID,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "high",
      headcount: 3,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "hybrid",
      location: "Bali, Indonesia",
      salaryMin: 80000000,
      salaryMax: 130000000,
      currency: "IDR",
      experienceMin: 5,
      experienceMax: 8,
      educationLevel: "Bachelor's",
      skills: [
        "Next.js",
        "React",
        "TypeScript",
        "PostgreSQL",
        "Node.js",
        "AWS",
      ],
      description:
        "We are looking for an experienced Full Stack Engineer to build and scale our HR technology platform. You'll work closely with our product team to deliver exceptional user experiences.",
      requirements:
        "- 5+ years of React/Next.js experience\n- Strong TypeScript skills\n- PostgreSQL and database design expertise\n- Experience with cloud platforms (AWS/GCP)\n- Excellent communication skills",
      responsibilities:
        "- Design and implement new features across the full stack\n- Collaborate with designers and product managers\n- Conduct code reviews and mentor junior engineers\n- Optimize application performance and scalability",
      publishedAt: daysAgo(30),
      targetHireDate: daysFromNow(30),
    },
    {
      id: VAC_PD,
      code: "ENG-002",
      title: "Product Designer",
      departmentId: DEPT_DES,
      creatorId: ADMIN_ID,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "medium",
      headcount: 2,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "onsite",
      location: "Bali, Indonesia",
      salaryMin: 60000000,
      salaryMax: 90000000,
      currency: "IDR",
      experienceMin: 3,
      experienceMax: 6,
      educationLevel: "Bachelor's",
      skills: [
        "Figma",
        "Design Systems",
        "Prototyping",
        "UX Research",
        "UI Design",
      ],
      description:
        "Looking for an exceptional Product Designer who specializes in SaaS interfaces and can translate complex requirements into intuitive experiences.",
      requirements:
        "- Figma mastery and design system experience\n- UX research and usability testing\n- Portfolio demonstrating SaaS product work\n- Strong collaboration skills",
      responsibilities:
        "- Own end-to-end design process from discovery to delivery\n- Build and maintain our design system\n- Conduct user research and usability testing\n- Collaborate with engineering on implementation",
      publishedAt: daysAgo(25),
      targetHireDate: daysFromNow(45),
    },
    {
      id: VAC_DEVOPS,
      code: "ENG-003",
      title: "DevOps Engineer",
      departmentId: DEPT_ENG,
      creatorId: USER_JAMES,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "high",
      headcount: 2,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "hybrid",
      location: "Bali, Indonesia",
      salaryMin: 90000000,
      salaryMax: 130000000,
      currency: "IDR",
      experienceMin: 4,
      experienceMax: 7,
      educationLevel: "Bachelor's",
      skills: [
        "Kubernetes",
        "Docker",
        "AWS",
        "CI/CD",
        "Terraform",
        "Linux",
        "Monitoring",
      ],
      description:
        "Join our infrastructure team to build and maintain the cloud architecture powering Nuanu's digital ecosystem.",
      requirements:
        "- 4+ years DevOps/SRE experience\n- Kubernetes and Docker proficiency\n- AWS certification preferred\n- Infrastructure as Code (Terraform)\n- Monitoring and observability tools",
      responsibilities:
        "- Design and manage cloud infrastructure on AWS\n- Implement CI/CD pipelines\n- Ensure system reliability and security\n- Automate operational workflows",
      publishedAt: daysAgo(20),
      targetHireDate: daysFromNow(40),
    },
    {
      id: VAC_MKTMGR,
      code: "MKT-001",
      title: "Marketing Manager",
      departmentId: DEPT_MKT,
      creatorId: USER_JAMES,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "medium",
      headcount: 1,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "onsite",
      location: "Bali, Indonesia",
      salaryMin: 70000000,
      salaryMax: 100000000,
      currency: "IDR",
      experienceMin: 5,
      experienceMax: 8,
      educationLevel: "Bachelor's",
      skills: [
        "Digital Marketing",
        "SEO",
        "Content Strategy",
        "Analytics",
        "Brand Management",
        "Social Media",
      ],
      description:
        "Lead Nuanu's marketing efforts to grow brand awareness and drive engagement across our wellness and resort brand.",
      requirements:
        "- 5+ years in marketing, preferably in hospitality or wellness\n- Proven track record in digital campaigns\n- Strong analytical skills\n- Experience managing creative teams",
      responsibilities:
        "- Develop and execute marketing strategy\n- Manage digital channels and campaigns\n- Oversee brand consistency\n- Analyze performance metrics and optimize",
      publishedAt: daysAgo(15),
      targetHireDate: daysFromNow(35),
    },
    {
      id: VAC_FINANL,
      code: "FIN-001",
      title: "Finance Analyst",
      departmentId: DEPT_FIN,
      creatorId: USER_DAVID,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "medium",
      headcount: 2,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "onsite",
      location: "Bali, Indonesia",
      salaryMin: 55000000,
      salaryMax: 80000000,
      currency: "IDR",
      experienceMin: 3,
      experienceMax: 5,
      educationLevel: "Bachelor's",
      skills: [
        "Financial Modeling",
        "Excel",
        "SQL",
        "Budgeting",
        "Financial Reporting",
        "ERP",
      ],
      description:
        "Support Nuanu's finance team in financial planning, analysis, and reporting to drive data-driven business decisions.",
      requirements:
        "- 3+ years in financial analysis\n- Advanced Excel and financial modeling\n- SQL proficiency\n- Experience with ERP systems\n- Strong attention to detail",
      responsibilities:
        "- Prepare monthly financial reports\n- Build and maintain financial models\n- Support budgeting and forecasting\n- Analyze operational metrics",
      publishedAt: daysAgo(18),
      targetHireDate: daysFromNow(42),
    },
    {
      id: VAC_PRODMGR,
      code: "PROD-001",
      title: "Product Manager",
      departmentId: DEPT_PROD,
      creatorId: ADMIN_ID,
      recruiterId: USER_MARIA,
      status: "draft",
      priority: "high",
      headcount: 1,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "hybrid",
      location: "Bali, Indonesia / Remote",
      salaryMin: 85000000,
      salaryMax: 120000000,
      currency: "IDR",
      experienceMin: 5,
      experienceMax: 9,
      educationLevel: "Bachelor's",
      skills: [
        "Product Strategy",
        "Roadmapping",
        "Agile",
        "Stakeholder Management",
        "Data Analysis",
        "JIRA",
      ],
      description:
        "Own the product vision and roadmap for Nuanu's guest experience platform.",
      requirements:
        "- 5+ years in product management\n- Experience with hospitality or consumer apps\n- Strong data analysis capabilities\n- Excellent stakeholder communication",
      responsibilities:
        "- Define product strategy and roadmap\n- Work with engineering on delivery\n- Conduct customer research\n- Prioritize backlog and features",
      targetHireDate: daysFromNow(60),
    },
    {
      id: VAC_OPSLEAD,
      code: "OPS-001",
      title: "Operations Lead",
      departmentId: DEPT_OPS,
      creatorId: USER_EMILY,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "low",
      headcount: 1,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "onsite",
      location: "Bali, Indonesia",
      salaryMin: 65000000,
      salaryMax: 90000000,
      currency: "IDR",
      experienceMin: 4,
      experienceMax: 7,
      educationLevel: "Bachelor's",
      skills: [
        "Operations Management",
        "Process Improvement",
        "Team Leadership",
        "ERP",
        "Hospitality",
      ],
      description:
        "Oversee daily resort operations and lead a team to deliver exceptional guest experiences at Nuanu.",
      requirements:
        "- 4+ years in resort/hospitality operations\n- Team leadership experience\n- Strong organizational skills\n- Knowledge of resort management software",
      responsibilities:
        "- Manage day-to-day resort operations\n- Lead and develop operations team\n- Improve operational processes\n- Ensure guest satisfaction standards",
      publishedAt: daysAgo(10),
      targetHireDate: daysFromNow(50),
    },
    {
      id: VAC_DATASCI,
      code: "ENG-004",
      title: "Data Scientist",
      departmentId: DEPT_ENG,
      creatorId: USER_ALEX,
      recruiterId: USER_MARIA,
      status: "published",
      priority: "high",
      headcount: 1,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "remote",
      location: "Remote",
      salaryMin: 95000000,
      salaryMax: 140000000,
      currency: "IDR",
      experienceMin: 3,
      experienceMax: 6,
      educationLevel: "Master's",
      skills: [
        "Python",
        "Machine Learning",
        "TensorFlow",
        "SQL",
        "Data Visualization",
        "Scikit-learn",
        "Statistics",
      ],
      description:
        "Drive data-informed decisions across Nuanu's business through advanced analytics and machine learning.",
      requirements:
        "- 3+ years in data science/ML\n- Python and ML frameworks expertise\n- Strong statistical background\n- Experience with large datasets",
      responsibilities:
        "- Build ML models for business use cases\n- Develop data pipelines\n- Create dashboards and reports\n- Collaborate with product and engineering teams",
      publishedAt: daysAgo(12),
      targetHireDate: daysFromNow(38),
    },
    {
      id: VAC_FEND,
      code: "ENG-005",
      title: "Frontend Developer",
      departmentId: DEPT_ENG,
      creatorId: ADMIN_ID,
      recruiterId: USER_MARIA,
      status: "closed",
      priority: "medium",
      headcount: 2,
      filledCount: 2,
      employmentType: "Full-Time",
      locationType: "hybrid",
      location: "Bali, Indonesia",
      salaryMin: 60000000,
      salaryMax: 90000000,
      currency: "IDR",
      experienceMin: 2,
      experienceMax: 5,
      educationLevel: "Bachelor's",
      skills: ["React", "TypeScript", "CSS", "Next.js", "Testing", "Git"],
      description:
        "Build beautiful, performant web interfaces for Nuanu's guest-facing and internal platforms.",
      requirements:
        "- 2+ years frontend development\n- React and TypeScript proficiency\n- CSS and responsive design\n- Testing experience",
      responsibilities:
        "- Implement UI components and pages\n- Ensure cross-browser compatibility\n- Write unit and integration tests\n- Collaborate with designers",
      publishedAt: daysAgo(60),
      closedAt: daysAgo(5),
    },
    {
      id: VAC_CONTENT,
      code: "MKT-002",
      title: "Content Strategist",
      departmentId: DEPT_MKT,
      creatorId: USER_JAMES,
      recruiterId: USER_MARIA,
      status: "draft",
      priority: "low",
      headcount: 1,
      filledCount: 0,
      employmentType: "Full-Time",
      locationType: "remote",
      location: "Remote",
      salaryMin: 45000000,
      salaryMax: 65000000,
      currency: "IDR",
      experienceMin: 2,
      experienceMax: 4,
      educationLevel: "Bachelor's",
      skills: [
        "Content Writing",
        "SEO",
        "Social Media",
        "Copywriting",
        "Content Planning",
      ],
      description:
        "Shape Nuanu's content strategy and create compelling stories about wellness and sustainable living.",
      requirements:
        "- 2+ years content strategy experience\n- SEO knowledge\n- Portfolio of written work\n- Social media expertise",
      responsibilities:
        "- Develop content calendar\n- Write and edit content across channels\n- Optimize content for SEO\n- Collaborate with marketing team",
      targetHireDate: daysFromNow(75),
    },
  ];
  for (const v of vacancyData) {
    await prisma.vacancy.upsert({
      where: { code: v.code },
      update: {
        title: v.title,
        departmentId: v.departmentId,
        recruiterId: v.recruiterId,
        status: v.status,
        priority: v.priority,
        headcount: v.headcount,
        filledCount: v.filledCount,
        employmentType: v.employmentType,
        locationType: v.locationType,
        location: v.location,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
        currency: v.currency,
        experienceMin: v.experienceMin,
        experienceMax: v.experienceMax,
        educationLevel: v.educationLevel,
        skills: v.skills,
        description: v.description,
        requirements: v.requirements,
        responsibilities: v.responsibilities,
        publishedAt: v.publishedAt ?? null,
        closedAt: v.closedAt ?? null,
        targetHireDate: v.targetHireDate ?? null,
      },
      create: {
        id: v.id,
        code: v.code,
        title: v.title,
        departmentId: v.departmentId,
        creatorId: v.creatorId,
        recruiterId: v.recruiterId,
        status: v.status,
        priority: v.priority,
        headcount: v.headcount,
        filledCount: v.filledCount,
        employmentType: v.employmentType,
        locationType: v.locationType,
        location: v.location,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
        currency: v.currency,
        experienceMin: v.experienceMin,
        experienceMax: v.experienceMax,
        educationLevel: v.educationLevel,
        skills: v.skills,
        description: v.description,
        requirements: v.requirements,
        responsibilities: v.responsibilities,
        publishedAt: v.publishedAt ?? null,
        closedAt: v.closedAt ?? null,
        targetHireDate: v.targetHireDate ?? null,
      },
    });
  }

  // ── 5. Candidate Users + Profiles ──────────────────────────────────────────
  console.log("  → Candidate users & profiles");
  const candidateHash = await bcrypt.hash("candidate2024", 10);
  const candidates = [
    {
      id: C[1],
      name: "Arjun Mehta",
      email: "arjun.mehta@gmail.com",
      phone: "+91-98765-43210",
      title: "Full Stack Developer",
      company: "InnoTech Solutions",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
      years: 6,
      location: "Mumbai, India",
      education: "B.Tech Computer Science, IIT Mumbai",
      salary: 90000000,
      notice: "1 month",
    },
    {
      id: C[2],
      name: "Sari Putri",
      email: "sari.putri@gmail.com",
      phone: "+62-812-345-6789",
      title: "UX Designer",
      company: "Tokopedia",
      skills: [
        "Figma",
        "UX Research",
        "Prototyping",
        "Design Systems",
        "Illustration",
      ],
      years: 4,
      location: "Jakarta, Indonesia",
      education: "B.Des Visual Communication, Institut Teknologi Bandung",
      salary: 70000000,
      notice: "2 weeks",
    },
    {
      id: C[3],
      name: "Liam O'Brien",
      email: "liam.obrien@outlook.com",
      phone: "+61-412-345-678",
      title: "DevOps Engineer",
      company: "Atlassian",
      skills: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD", "Python"],
      years: 5,
      location: "Sydney, Australia",
      education: "B.Sc Computer Science, UNSW",
      salary: 120000000,
      notice: "1 month",
    },
    {
      id: C[4],
      name: "Ratna Dewi",
      email: "ratna.dewi@gmail.com",
      phone: "+62-813-456-7890",
      title: "Frontend Developer",
      company: "Gojek",
      skills: ["React", "Vue.js", "TypeScript", "CSS", "Next.js"],
      years: 3,
      location: "Bali, Indonesia",
      education: "S1 Teknik Informatika, Universitas Udayana",
      salary: 65000000,
      notice: "2 weeks",
    },
    {
      id: C[5],
      name: "Marcus Johnson",
      email: "marcus.j@gmail.com",
      phone: "+1-555-234-5678",
      title: "Marketing Specialist",
      company: "Airbnb",
      skills: [
        "Digital Marketing",
        "SEO",
        "Google Analytics",
        "Content Strategy",
        "Social Media",
      ],
      years: 5,
      location: "San Francisco, USA",
      education: "B.A. Marketing, UC Berkeley",
      salary: 95000000,
      notice: "1 month",
    },
    {
      id: C[6],
      name: "Nina Patel",
      email: "nina.patel@gmail.com",
      phone: "+44-7700-900123",
      title: "Data Scientist",
      company: "DeepMind",
      skills: [
        "Python",
        "TensorFlow",
        "Machine Learning",
        "SQL",
        "Statistics",
        "PyTorch",
      ],
      years: 4,
      location: "London, UK",
      education: "M.Sc Data Science, Imperial College London",
      salary: 130000000,
      notice: "1 month",
    },
    {
      id: C[7],
      name: "Budi Santoso",
      email: "budi.santoso@gmail.com",
      phone: "+62-821-567-8901",
      title: "Product Designer",
      company: "Traveloka",
      skills: [
        "Figma",
        "UI Design",
        "Prototyping",
        "User Testing",
        "Design Systems",
      ],
      years: 5,
      location: "Jakarta, Indonesia",
      education: "S1 Desain Komunikasi Visual, Binus University",
      salary: 80000000,
      notice: "3 weeks",
    },
    {
      id: C[8],
      name: "Sofia Reyes",
      email: "sofia.reyes@gmail.com",
      phone: "+52-55-1234-5678",
      title: "Marketing Manager",
      company: "Booking.com",
      skills: [
        "Brand Management",
        "Campaign Management",
        "Analytics",
        "Team Leadership",
        "SEO",
      ],
      years: 7,
      location: "Mexico City, Mexico",
      education: "B.A. Marketing, ITAM",
      salary: 85000000,
      notice: "1 month",
    },
    {
      id: C[9],
      name: "Tan Wei Ming",
      email: "wei.ming@gmail.com",
      phone: "+65-9123-4567",
      title: "Senior Software Engineer",
      company: "Sea Group",
      skills: [
        "Go",
        "Microservices",
        "Kubernetes",
        "PostgreSQL",
        "Redis",
        "gRPC",
      ],
      years: 7,
      location: "Singapore",
      education: "B.Eng Computer Engineering, NUS",
      salary: 115000000,
      notice: "2 months",
    },
    {
      id: C[10],
      name: "Priya Krishnan",
      email: "priya.k@gmail.com",
      phone: "+91-99876-54321",
      title: "Finance Analyst",
      company: "KPMG",
      skills: ["Financial Modeling", "Excel", "SQL", "Power BI", "Budgeting"],
      years: 4,
      location: "Bangalore, India",
      education: "MBA Finance, IIM Ahmedabad",
      salary: 75000000,
      notice: "1 month",
    },
    {
      id: C[11],
      name: "Dewa Putu",
      email: "dewa.putu@gmail.com",
      phone: "+62-819-678-9012",
      title: "Operations Supervisor",
      company: "Alila Villas",
      skills: [
        "Operations Management",
        "Hospitality",
        "Team Leadership",
        "ERP",
        "Guest Relations",
      ],
      years: 5,
      location: "Bali, Indonesia",
      education: "S1 Manajemen Perhotelan, STP Bali",
      salary: 72000000,
      notice: "3 weeks",
    },
    {
      id: C[12],
      name: "Emma Wilson",
      email: "emma.wilson@gmail.com",
      phone: "+61-423-456-789",
      title: "Operations Manager",
      company: "Six Senses",
      skills: [
        "Resort Operations",
        "Budget Management",
        "Staff Training",
        "Process Improvement",
        "PMS",
      ],
      years: 6,
      location: "Melbourne, Australia",
      education: "B.B.A. Hospitality Management, La Trobe University",
      salary: 88000000,
      notice: "1 month",
    },
    {
      id: C[13],
      name: "Rizky Pratama",
      email: "rizky.pratama@gmail.com",
      phone: "+62-822-789-0123",
      title: "Data Analyst",
      company: "Bukalapak",
      skills: ["Python", "SQL", "Tableau", "Machine Learning", "Statistics"],
      years: 3,
      location: "Bandung, Indonesia",
      education: "S1 Statistika, ITB",
      salary: 60000000,
      notice: "2 weeks",
    },
    {
      id: C[14],
      name: "Charlotte Blanc",
      email: "charlotte.b@gmail.com",
      phone: "+33-6-12-34-56-78",
      title: "Frontend Engineer",
      company: "Spotify",
      skills: [
        "React",
        "TypeScript",
        "CSS",
        "Testing",
        "Performance Optimization",
        "Next.js",
      ],
      years: 4,
      location: "Paris, France",
      education: "M.Sc Computer Science, École Polytechnique",
      salary: 90000000,
      notice: "1 month",
    },
    {
      id: C[15],
      name: "Ahmad Fauzi",
      email: "ahmad.fauzi@gmail.com",
      phone: "+62-815-890-1234",
      title: "Cloud Engineer",
      company: "Telkom Indonesia",
      skills: ["AWS", "GCP", "Kubernetes", "Docker", "Ansible", "Python"],
      years: 5,
      location: "Jakarta, Indonesia",
      education: "S1 Teknik Informatika, UI",
      salary: 95000000,
      notice: "1 month",
    },
    {
      id: C[16],
      name: "Yuki Tanaka",
      email: "yuki.tanaka@gmail.com",
      phone: "+81-90-1234-5678",
      title: "Full Stack Developer",
      company: "Mercari",
      skills: [
        "React",
        "Go",
        "TypeScript",
        "PostgreSQL",
        "Microservices",
        "Redis",
      ],
      years: 6,
      location: "Tokyo, Japan",
      education: "B.Eng Computer Science, Tokyo University",
      salary: 105000000,
      notice: "2 months",
    },
    {
      id: C[17],
      name: "Indah Permata",
      email: "indah.permata@gmail.com",
      phone: "+62-817-901-2345",
      title: "Content Writer",
      company: "KompasGram",
      skills: [
        "Content Writing",
        "SEO",
        "Social Media",
        "Copywriting",
        "WordPress",
      ],
      years: 3,
      location: "Yogyakarta, Indonesia",
      education: "S1 Ilmu Komunikasi, UGM",
      salary: 48000000,
      notice: "2 weeks",
    },
    {
      id: C[18],
      name: "Carlos Mendoza",
      email: "carlos.m@gmail.com",
      phone: "+34-612-345-678",
      title: "Growth Marketer",
      company: "Glovo",
      skills: [
        "Growth Marketing",
        "A/B Testing",
        "Analytics",
        "SEO",
        "Email Marketing",
      ],
      years: 4,
      location: "Madrid, Spain",
      education: "B.A. Business, IE Business School",
      salary: 72000000,
      notice: "1 month",
    },
    {
      id: C[19],
      name: "Ayu Wulandari",
      email: "ayu.wulandari@gmail.com",
      phone: "+62-818-012-3456",
      title: "UI/UX Designer",
      company: "Tokopedia",
      skills: ["Figma", "UX Research", "Wireframing", "Prototyping", "CSS"],
      years: 3,
      location: "Bali, Indonesia",
      education: "S1 Desain Grafis, Institut Seni Indonesia",
      salary: 62000000,
      notice: "2 weeks",
    },
    {
      id: C[20],
      name: "James Kimani",
      email: "james.kimani@gmail.com",
      phone: "+254-722-123-456",
      title: "Financial Analyst",
      company: "Deloitte East Africa",
      skills: ["Financial Analysis", "Excel", "Power BI", "IFRS", "Budgeting"],
      years: 3,
      location: "Nairobi, Kenya",
      education: "B.Com Finance, University of Nairobi",
      salary: 58000000,
      notice: "1 month",
    },
  ];

  for (const c of candidates) {
    const existing = await prisma.user.findUnique({
      where: { email: c.email },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: c.id,
          email: c.email,
          name: c.name,
          password: candidateHash,
          phone: c.phone,
          isActive: true,
        },
      });
    }
    await prisma.candidateProfile.upsert({
      where: { userId: c.id },
      update: {
        headline: c.title,
        currentTitle: c.title,
        currentCompany: c.company,
        skills: c.skills,
        experienceYears: c.years,
        location: c.location,
        education: c.education,
        expectedSalary: c.salary,
        noticePeriod: c.notice,
        willingToRelocate: true,
        summary: `Experienced ${c.title} with ${c.years} years of expertise in ${c.skills.slice(0, 3).join(", ")} and more. Currently at ${c.company}, seeking new opportunities.`,
      },
      create: {
        userId: c.id,
        headline: c.title,
        currentTitle: c.title,
        currentCompany: c.company,
        skills: c.skills,
        experienceYears: c.years,
        location: c.location,
        education: c.education,
        expectedSalary: c.salary,
        noticePeriod: c.notice,
        willingToRelocate: true,
        summary: `Experienced ${c.title} with ${c.years} years of expertise in ${c.skills.slice(0, 3).join(", ")} and more. Currently at ${c.company}, seeking new opportunities.`,
      },
    });
  }

  // ── 6. Applications ─────────────────────────────────────────────────────────
  console.log("  → Applications");
  // Map: [appIdx, candidateIdx, vacancyId, stage, source, appliedDaysAgo]
  const appData: Array<{
    id: string;
    candidateId: string;
    vacancyId: string;
    stage: string;
    status: string;
    source: string;
    appliedAt: Date;
    isStarred: boolean;
  }> = [
    {
      id: A[1],
      candidateId: C[1],
      vacancyId: VAC_SSE,
      stage: "hr_interview",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(28),
      isStarred: true,
    },
    {
      id: A[2],
      candidateId: C[2],
      vacancyId: VAC_PD,
      stage: "screening",
      status: "active",
      source: "Careers Page",
      appliedAt: daysAgo(22),
      isStarred: false,
    },
    {
      id: A[3],
      candidateId: C[3],
      vacancyId: VAC_DEVOPS,
      stage: "final_interview",
      status: "active",
      source: "JobStreet",
      appliedAt: daysAgo(25),
      isStarred: true,
    },
    {
      id: A[4],
      candidateId: C[4],
      vacancyId: VAC_SSE,
      stage: "screening",
      status: "active",
      source: "Careers Page",
      appliedAt: daysAgo(20),
      isStarred: false,
    },
    {
      id: A[5],
      candidateId: C[5],
      vacancyId: VAC_MKTMGR,
      stage: "applied",
      status: "new",
      source: "LinkedIn",
      appliedAt: daysAgo(5),
      isStarred: false,
    },
    {
      id: A[6],
      candidateId: C[6],
      vacancyId: VAC_DATASCI,
      stage: "hired",
      status: "hired",
      source: "Referral",
      appliedAt: daysAgo(60),
      isStarred: true,
    },
    {
      id: A[7],
      candidateId: C[7],
      vacancyId: VAC_PD,
      stage: "hr_interview",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(18),
      isStarred: false,
    },
    {
      id: A[8],
      candidateId: C[8],
      vacancyId: VAC_MKTMGR,
      stage: "user_interview",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(21),
      isStarred: true,
    },
    {
      id: A[9],
      candidateId: C[9],
      vacancyId: VAC_SSE,
      stage: "final_interview",
      status: "active",
      source: "GitHub Jobs",
      appliedAt: daysAgo(26),
      isStarred: true,
    },
    {
      id: A[10],
      candidateId: C[10],
      vacancyId: VAC_FINANL,
      stage: "applied",
      status: "new",
      source: "Careers Page",
      appliedAt: daysAgo(3),
      isStarred: false,
    },
    {
      id: A[11],
      candidateId: C[11],
      vacancyId: VAC_OPSLEAD,
      stage: "applied",
      status: "new",
      source: "JobStreet",
      appliedAt: daysAgo(7),
      isStarred: false,
    },
    {
      id: A[12],
      candidateId: C[12],
      vacancyId: VAC_OPSLEAD,
      stage: "screening",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(14),
      isStarred: false,
    },
    {
      id: A[13],
      candidateId: C[13],
      vacancyId: VAC_DATASCI,
      stage: "hr_interview",
      status: "active",
      source: "Careers Page",
      appliedAt: daysAgo(19),
      isStarred: false,
    },
    {
      id: A[14],
      candidateId: C[14],
      vacancyId: VAC_FEND,
      stage: "hired",
      status: "hired",
      source: "LinkedIn",
      appliedAt: daysAgo(55),
      isStarred: true,
    },
    {
      id: A[15],
      candidateId: C[15],
      vacancyId: VAC_DEVOPS,
      stage: "offer",
      status: "active",
      source: "Referral",
      appliedAt: daysAgo(35),
      isStarred: true,
    },
    {
      id: A[16],
      candidateId: C[16],
      vacancyId: VAC_SSE,
      stage: "offer",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(32),
      isStarred: true,
    },
    {
      id: A[17],
      candidateId: C[17],
      vacancyId: VAC_CONTENT,
      stage: "applied",
      status: "new",
      source: "Careers Page",
      appliedAt: daysAgo(2),
      isStarred: false,
    },
    {
      id: A[18],
      candidateId: C[18],
      vacancyId: VAC_MKTMGR,
      stage: "screening",
      status: "active",
      source: "LinkedIn",
      appliedAt: daysAgo(16),
      isStarred: false,
    },
    {
      id: A[19],
      candidateId: C[19],
      vacancyId: VAC_PD,
      stage: "user_interview",
      status: "active",
      source: "Careers Page",
      appliedAt: daysAgo(23),
      isStarred: false,
    },
    {
      id: A[20],
      candidateId: C[20],
      vacancyId: VAC_FINANL,
      stage: "rejected",
      status: "rejected",
      source: "LinkedIn",
      appliedAt: daysAgo(30),
      isStarred: false,
    },
  ];

  for (const app of appData) {
    await prisma.application.upsert({
      where: {
        vacancyId_candidateId: {
          vacancyId: app.vacancyId,
          candidateId: app.candidateId,
        },
      },
      update: {
        currentStage: app.stage,
        status: app.status,
        isStarred: app.isStarred,
      },
      create: {
        id: app.id,
        vacancyId: app.vacancyId,
        candidateId: app.candidateId,
        source: app.source,
        status: app.status,
        currentStage: app.stage,
        appliedAt: app.appliedAt,
        isStarred: app.isStarred,
      },
    });
  }

  // ── 7. Candidate Scores ─────────────────────────────────────────────────────
  console.log("  → Candidate scores");
  // Re-fetch application IDs to get actual IDs after upsert
  const scoreData = [
    {
      idx: 1,
      appRef: [VAC_SSE, C[1]],
      overall: 91,
      hard: 92,
      soft: 88,
      exp: 93,
      edu: 90,
      fmt: 92,
      matched: ["React", "Node.js", "TypeScript", "PostgreSQL"],
      missing: ["AWS"],
      strengths: [
        "Deep TypeScript expertise",
        "Strong PostgreSQL skills",
        "Leadership experience",
      ],
    },
    {
      idx: 2,
      appRef: [VAC_PD, C[2]],
      overall: 83,
      hard: 85,
      soft: 82,
      exp: 80,
      edu: 84,
      fmt: 84,
      matched: ["Figma", "Prototyping", "Design Systems"],
      missing: ["User Research"],
      strengths: [
        "Excellent Figma proficiency",
        "Strong portfolio",
        "Good UI instincts",
      ],
    },
    {
      idx: 3,
      appRef: [VAC_DEVOPS, C[3]],
      overall: 89,
      hard: 90,
      soft: 87,
      exp: 88,
      edu: 88,
      fmt: 92,
      matched: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD"],
      missing: [],
      strengths: [
        "Comprehensive cloud expertise",
        "Strong automation skills",
        "Excellent background",
      ],
    },
    {
      idx: 4,
      appRef: [VAC_SSE, C[4]],
      overall: 74,
      hard: 72,
      soft: 76,
      exp: 70,
      edu: 76,
      fmt: 76,
      matched: ["React", "TypeScript", "Next.js"],
      missing: ["PostgreSQL", "Docker"],
      strengths: ["Strong React skills", "Quick learner", "Good communication"],
    },
    {
      idx: 5,
      appRef: [VAC_MKTMGR, C[5]],
      overall: 79,
      hard: 78,
      soft: 82,
      exp: 80,
      edu: 76,
      fmt: 79,
      matched: ["Digital Marketing", "SEO", "Content Strategy"],
      missing: ["Hospitality experience"],
      strengths: ["Strong digital background", "Data-driven approach"],
    },
    {
      idx: 6,
      appRef: [VAC_DATASCI, C[6]],
      overall: 94,
      hard: 95,
      soft: 90,
      exp: 94,
      edu: 96,
      fmt: 95,
      matched: [
        "Python",
        "TensorFlow",
        "Machine Learning",
        "SQL",
        "Statistics",
      ],
      missing: [],
      strengths: [
        "World-class ML expertise",
        "Top university credentials",
        "Strong publication record",
      ],
    },
    {
      idx: 7,
      appRef: [VAC_PD, C[7]],
      overall: 86,
      hard: 87,
      soft: 84,
      exp: 87,
      edu: 86,
      fmt: 86,
      matched: ["Figma", "UI Design", "Prototyping", "Design Systems"],
      missing: [],
      strengths: [
        "Extensive design portfolio",
        "Strong design systems knowledge",
        "Local market understanding",
      ],
    },
    {
      idx: 8,
      appRef: [VAC_MKTMGR, C[8]],
      overall: 88,
      hard: 86,
      soft: 91,
      exp: 90,
      edu: 85,
      fmt: 88,
      matched: ["Brand Management", "Analytics", "Team Leadership", "SEO"],
      missing: [],
      strengths: [
        "Strong leadership",
        "Proven campaign results",
        "Excellent communication",
      ],
    },
    {
      idx: 9,
      appRef: [VAC_SSE, C[9]],
      overall: 87,
      hard: 89,
      soft: 83,
      exp: 90,
      edu: 86,
      fmt: 87,
      matched: ["PostgreSQL", "Redis", "Microservices", "Go"],
      missing: ["React", "Next.js"],
      strengths: [
        "Deep backend expertise",
        "Scalability experience",
        "Strong engineering culture fit",
      ],
    },
    {
      idx: 10,
      appRef: [VAC_FINANL, C[10]],
      overall: 80,
      hard: 82,
      soft: 78,
      exp: 80,
      edu: 84,
      fmt: 78,
      matched: ["Financial Modeling", "Excel", "SQL"],
      missing: ["Power BI", "ERP"],
      strengths: [
        "Strong analytical skills",
        "Top MBA credentials",
        "Attention to detail",
      ],
    },
    {
      idx: 11,
      appRef: [VAC_OPSLEAD, C[11]],
      overall: 75,
      hard: 73,
      soft: 79,
      exp: 76,
      edu: 72,
      fmt: 75,
      matched: ["Operations Management", "Hospitality", "Team Leadership"],
      missing: ["ERP"],
      strengths: [
        "Local market knowledge",
        "Hospitality background",
        "Team player",
      ],
    },
    {
      idx: 12,
      appRef: [VAC_OPSLEAD, C[12]],
      overall: 85,
      hard: 83,
      soft: 87,
      exp: 88,
      edu: 82,
      fmt: 85,
      matched: [
        "Resort Operations",
        "Budget Management",
        "Process Improvement",
      ],
      missing: [],
      strengths: [
        "International resort experience",
        "Strong leadership",
        "Budget management",
      ],
    },
    {
      idx: 13,
      appRef: [VAC_DATASCI, C[13]],
      overall: 68,
      hard: 70,
      soft: 65,
      exp: 64,
      edu: 70,
      fmt: 71,
      matched: ["Python", "SQL", "Statistics"],
      missing: ["TensorFlow", "Deep Learning", "PyTorch"],
      strengths: [
        "Solid analytical foundation",
        "Fast learner",
        "Good SQL skills",
      ],
    },
    {
      idx: 14,
      appRef: [VAC_FEND, C[14]],
      overall: 92,
      hard: 93,
      soft: 90,
      exp: 92,
      edu: 94,
      fmt: 91,
      matched: ["React", "TypeScript", "CSS", "Next.js", "Testing"],
      missing: [],
      strengths: [
        "Exceptional frontend skills",
        "Top-tier background",
        "Strong testing culture",
      ],
    },
    {
      idx: 15,
      appRef: [VAC_DEVOPS, C[15]],
      overall: 84,
      hard: 85,
      soft: 82,
      exp: 86,
      edu: 82,
      fmt: 85,
      matched: ["AWS", "GCP", "Kubernetes", "Docker", "Python"],
      missing: ["Terraform"],
      strengths: [
        "Multi-cloud expertise",
        "Strong automation skills",
        "Local candidate",
      ],
    },
    {
      idx: 16,
      appRef: [VAC_SSE, C[16]],
      overall: 89,
      hard: 91,
      soft: 85,
      exp: 90,
      edu: 88,
      fmt: 91,
      matched: ["React", "TypeScript", "PostgreSQL", "Microservices", "Redis"],
      missing: [],
      strengths: [
        "Full stack depth",
        "Microservices expertise",
        "Strong engineering background",
      ],
    },
    {
      idx: 17,
      appRef: [VAC_MKTMGR, C[18]],
      overall: 76,
      hard: 75,
      soft: 78,
      exp: 76,
      edu: 75,
      fmt: 76,
      matched: ["Growth Marketing", "Analytics", "SEO", "A/B Testing"],
      missing: ["Brand Management", "Team Leadership"],
      strengths: ["Data-driven marketer", "Growth expertise"],
    },
    {
      idx: 18,
      appRef: [VAC_PD, C[19]],
      overall: 72,
      hard: 73,
      soft: 71,
      exp: 68,
      edu: 74,
      fmt: 74,
      matched: ["Figma", "UX Research", "Prototyping"],
      missing: ["Design Systems"],
      strengths: [
        "Good UX foundation",
        "Local candidate",
        "Creative portfolio",
      ],
    },
  ];

  for (const sc of scoreData) {
    const app = await prisma.application.findFirst({
      where: { vacancyId: sc.appRef[0], candidateId: sc.appRef[1] },
    });
    if (!app) continue;
    await prisma.candidateScore.upsert({
      where: { applicationId: app.id },
      update: {
        overallScore: sc.overall,
        hardSkillsScore: sc.hard,
        softSkillsScore: sc.soft,
        experienceScore: sc.exp,
        educationScore: sc.edu,
        formatScore: sc.fmt,
        matchedKeywords: sc.matched,
        missingKeywords: sc.missing,
        strengths: sc.strengths,
        recommendations: [
          "Schedule technical assessment",
          "Conduct cultural fit interview",
        ],
      },
      create: {
        id: S[sc.idx],
        applicationId: app.id,
        overallScore: sc.overall,
        hardSkillsScore: sc.hard,
        softSkillsScore: sc.soft,
        experienceScore: sc.exp,
        educationScore: sc.edu,
        formatScore: sc.fmt,
        matchedKeywords: sc.matched,
        missingKeywords: sc.missing,
        strengths: sc.strengths,
        recommendations: [
          "Schedule technical assessment",
          "Conduct cultural fit interview",
        ],
      },
    });
  }

  // ── 8. Interviews ───────────────────────────────────────────────────────────
  console.log("  → Interviews");
  const interviewDefs = [
    {
      id: I[1],
      vacancyId: VAC_SSE,
      candidateId: C[1],
      type: "technical",
      stage: "hr_interview",
      scheduledAt: daysFromNow(3),
      duration: 60,
      status: "scheduled",
      location: "Google Meet",
      interviewerId: USER_ALEX,
    },
    {
      id: I[2],
      vacancyId: VAC_DEVOPS,
      candidateId: C[3],
      type: "onsite",
      stage: "final_interview",
      scheduledAt: daysFromNow(5),
      duration: 90,
      status: "scheduled",
      location: "Nuanu HQ, Bali",
      interviewerId: USER_ALEX,
    },
    {
      id: I[3],
      vacancyId: VAC_PD,
      candidateId: C[7],
      type: "video",
      stage: "hr_interview",
      scheduledAt: daysFromNow(1),
      duration: 45,
      status: "scheduled",
      location: "Zoom",
      interviewerId: USER_JAMES,
    },
    {
      id: I[4],
      vacancyId: VAC_MKTMGR,
      candidateId: C[8],
      type: "video",
      stage: "user_interview",
      scheduledAt: daysFromNow(2),
      duration: 60,
      status: "scheduled",
      location: "Google Meet",
      interviewerId: USER_EMILY,
    },
    {
      id: I[5],
      vacancyId: VAC_SSE,
      candidateId: C[9],
      type: "technical",
      stage: "final_interview",
      scheduledAt: daysFromNow(4),
      duration: 90,
      status: "scheduled",
      location: "Nuanu HQ, Bali",
      interviewerId: USER_ALEX,
    },
    {
      id: I[6],
      vacancyId: VAC_DATASCI,
      candidateId: C[13],
      type: "phone",
      stage: "hr_interview",
      scheduledAt: daysAgo(7),
      duration: 30,
      status: "completed",
      location: "Phone Call",
      interviewerId: USER_JAMES,
    },
    {
      id: I[7],
      vacancyId: VAC_FEND,
      candidateId: C[14],
      type: "technical",
      stage: "final_interview",
      scheduledAt: daysAgo(20),
      duration: 90,
      status: "completed",
      location: "Nuanu HQ, Bali",
      interviewerId: USER_ALEX,
    },
    {
      id: I[8],
      vacancyId: VAC_PD,
      candidateId: C[19],
      type: "video",
      stage: "user_interview",
      scheduledAt: daysAgo(5),
      duration: 60,
      status: "completed",
      location: "Zoom",
      interviewerId: USER_EMILY,
    },
  ];

  for (const intv of interviewDefs) {
    const app = await prisma.application.findFirst({
      where: { vacancyId: intv.vacancyId, candidateId: intv.candidateId },
    });
    if (!app) continue;
    await prisma.interview.upsert({
      where: { id: intv.id },
      update: {
        scheduledAt: intv.scheduledAt,
        status: intv.status,
        type: intv.type,
        stage: intv.stage,
        location: intv.location,
        duration: intv.duration,
        interviewerId: intv.interviewerId,
      },
      create: {
        id: intv.id,
        applicationId: app.id,
        interviewerId: intv.interviewerId,
        type: intv.type,
        stage: intv.stage,
        scheduledAt: intv.scheduledAt,
        duration: intv.duration,
        location: intv.location,
        status: intv.status,
        meetingUrl:
          intv.status === "scheduled"
            ? "https://meet.google.com/xyz-abcd-efg"
            : undefined,
        completedAt: intv.status === "completed" ? intv.scheduledAt : undefined,
      },
    });
  }

  // ── 9. Offers ───────────────────────────────────────────────────────────────
  console.log("  → Offers");
  const offerDefs = [
    {
      id: O[1],
      vacancyId: VAC_DATASCI,
      candidateId: C[6],
      salary: 130000000,
      currency: "IDR",
      status: "accepted",
      sentAt: daysAgo(25),
      startDate: daysFromNow(14),
      notes: "Accepted with delight. Start date confirmed.",
    },
    {
      id: O[2],
      vacancyId: VAC_FEND,
      candidateId: C[14],
      salary: 90000000,
      currency: "IDR",
      status: "accepted",
      sentAt: daysAgo(18),
      startDate: daysFromNow(7),
      notes: "Offer accepted. Onboarding in progress.",
    },
    {
      id: O[3],
      vacancyId: VAC_DEVOPS,
      candidateId: C[15],
      salary: 120000000,
      currency: "IDR",
      status: "sent",
      sentAt: daysAgo(3),
      startDate: daysFromNow(30),
      notes: "Awaiting candidate response. Strong fit.",
    },
    {
      id: O[4],
      vacancyId: VAC_SSE,
      candidateId: C[16],
      salary: 115000000,
      currency: "IDR",
      status: "sent",
      sentAt: daysAgo(2),
      startDate: daysFromNow(30),
      notes: "Competitive offer extended. Following up.",
    },
  ];

  for (const offer of offerDefs) {
    const app = await prisma.application.findFirst({
      where: { vacancyId: offer.vacancyId, candidateId: offer.candidateId },
    });
    if (!app) continue;
    await prisma.offer.upsert({
      where: { applicationId: app.id },
      update: {
        salary: offer.salary,
        currency: offer.currency,
        status: offer.status,
        notes: offer.notes,
      },
      create: {
        id: offer.id,
        applicationId: app.id,
        salary: offer.salary,
        currency: offer.currency,
        salaryPeriod: "annual",
        status: offer.status,
        sentAt: offer.sentAt,
        startDate: offer.startDate,
        notes: offer.notes,
        expiresAt: new Date(offer.sentAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ── 10. Activity Logs ───────────────────────────────────────────────────────
  console.log("  → Activity logs");
  const activityDefs = [
    {
      id: L[1],
      action: "created",
      resource: "vacancy",
      resourceId: VAC_DEVOPS,
      metadata: { title: "DevOps Engineer" },
      createdAt: daysAgo(20),
    },
    {
      id: L[2],
      action: "published",
      resource: "vacancy",
      resourceId: VAC_DEVOPS,
      metadata: { title: "DevOps Engineer", status: "published" },
      createdAt: daysAgo(20),
    },
    {
      id: L[3],
      action: "applied",
      resource: "application",
      resourceId: A[1],
      metadata: {
        candidate: "Arjun Mehta",
        vacancy: "Senior Full Stack Engineer",
      },
      createdAt: daysAgo(28),
    },
    {
      id: L[4],
      action: "moved",
      resource: "application",
      resourceId: A[3],
      metadata: { from: "hr_interview", to: "final_interview" },
      createdAt: daysAgo(8),
    },
    {
      id: L[5],
      action: "scheduled",
      resource: "interview",
      resourceId: I[1],
      metadata: { candidate: "Arjun Mehta", type: "technical" },
      createdAt: daysAgo(5),
    },
    {
      id: L[6],
      action: "sent",
      resource: "offer",
      resourceId: O[3],
      metadata: { candidate: "Ahmad Fauzi", salary: "120,000,000 IDR" },
      createdAt: daysAgo(3),
    },
    {
      id: L[7],
      action: "accepted",
      resource: "offer",
      resourceId: O[1],
      metadata: { candidate: "Nina Patel", position: "Data Scientist" },
      createdAt: daysAgo(24),
    },
    {
      id: L[8],
      action: "created",
      resource: "vacancy",
      resourceId: VAC_MKTMGR,
      metadata: { title: "Marketing Manager" },
      createdAt: daysAgo(15),
    },
    {
      id: L[9],
      action: "hired",
      resource: "application",
      resourceId: A[14],
      metadata: {
        candidate: "Charlotte Blanc",
        position: "Frontend Developer",
      },
      createdAt: daysAgo(10),
    },
    {
      id: L[10],
      action: "rejected",
      resource: "application",
      resourceId: A[20],
      metadata: {
        candidate: "James Kimani",
        reason: "Insufficient experience",
      },
      createdAt: daysAgo(12),
    },
  ];
  for (const log of activityDefs) {
    await prisma.activityLog.upsert({
      where: { id: log.id },
      update: {},
      create: {
        id: log.id,
        userId: ADMIN_ID,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      },
    });
  }

  // ── 11. Notifications ───────────────────────────────────────────────────────
  console.log("  → Notifications");
  const notifDefs = [
    {
      id: N[1],
      type: "application",
      title: "New Application",
      message: "Arjun Mehta applied for Senior Full Stack Engineer",
      link: "/dashboard/candidates",
      isRead: false,
      createdAt: daysAgo(28),
    },
    {
      id: N[2],
      type: "interview",
      title: "Interview Tomorrow",
      message: "Interview with Sari Putri scheduled for tomorrow",
      link: "/dashboard/interviews",
      isRead: false,
      createdAt: daysAgo(1),
    },
    {
      id: N[3],
      type: "offer",
      title: "Offer Accepted",
      message: "Nina Patel accepted the Data Scientist offer 🎉",
      link: "/dashboard/offers",
      isRead: true,
      createdAt: daysAgo(24),
    },
    {
      id: N[4],
      type: "application",
      title: "5 New Applications",
      message: "5 new candidates applied in the last 3 days",
      link: "/dashboard/candidates",
      isRead: true,
      createdAt: daysAgo(3),
    },
    {
      id: N[5],
      type: "interview",
      title: "Interview Scheduled",
      message: "Technical interview with Liam O'Brien on Friday",
      link: "/dashboard/interviews",
      isRead: false,
      createdAt: daysAgo(2),
    },
  ];
  for (const notif of notifDefs) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: { isRead: notif.isRead },
      create: {
        id: notif.id,
        userId: ADMIN_ID,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      },
    });
  }

  // ── 12. Onboarding Tasks ────────────────────────────────────────────────────
  console.log("  → Onboarding tasks");
  // For hired candidates: C[6] (Nina Patel - Data Scientist) and C[14] (Charlotte Blanc - Frontend)
  const onboardDefs = [
    {
      id: OB[1],
      employeeId: C[6],
      title: "IT Equipment Setup",
      category: "it_setup",
      priority: 1,
      status: "completed",
      dueDate: daysAgo(15),
      description: "Set up laptop, accounts and development environment",
    },
    {
      id: OB[2],
      employeeId: C[6],
      title: "Submit Employment Documents",
      category: "documentation",
      priority: 2,
      status: "completed",
      dueDate: daysAgo(20),
      description:
        "KITAS/work permit, tax registration, health insurance enrollment",
    },
    {
      id: OB[3],
      employeeId: C[6],
      title: "Department Orientation",
      category: "orientation",
      priority: 3,
      status: "in_progress",
      dueDate: daysFromNow(2),
      description: "Meet the engineering team and understand team workflows",
    },
    {
      id: OB[4],
      employeeId: C[14],
      title: "IT Equipment Setup",
      category: "it_setup",
      priority: 1,
      status: "completed",
      dueDate: daysAgo(5),
      description: "Set up MacBook, access to GitHub, Figma, and Notion",
    },
    {
      id: OB[5],
      employeeId: C[14],
      title: "Submit Employment Documents",
      category: "documentation",
      priority: 2,
      status: "in_progress",
      dueDate: daysFromNow(2),
      description: "Work permit, tax ID, and insurance documents",
    },
    {
      id: OB[6],
      employeeId: C[14],
      title: "Frontend Codebase Walkthrough",
      category: "training",
      priority: 3,
      status: "pending",
      dueDate: daysFromNow(5),
      description:
        "Review codebase structure, conventions, and CI/CD pipeline with Alex Kumar",
    },
  ];
  for (const ob of onboardDefs) {
    await prisma.onboardingTask.upsert({
      where: { id: ob.id },
      update: { status: ob.status },
      create: {
        id: ob.id,
        employeeId: ob.employeeId,
        title: ob.title,
        description: ob.description,
        category: ob.category,
        priority: ob.priority,
        status: ob.status,
        dueDate: ob.dueDate,
        completedAt: ob.status === "completed" ? ob.dueDate : undefined,
      },
    });
  }

  console.log("\n✅ Seed complete! Summary:");
  const [
    deptCount,
    vacCount,
    userCount,
    appCount,
    scoreCount,
    intvCount,
    offerCount,
  ] = await Promise.all([
    prisma.department.count(),
    prisma.vacancy.count(),
    prisma.user.count(),
    prisma.application.count(),
    prisma.candidateScore.count(),
    prisma.interview.count(),
    prisma.offer.count(),
  ]);
  console.log(`   Departments: ${deptCount}`);
  console.log(`   Vacancies:   ${vacCount}`);
  console.log(`   Users:       ${userCount}`);
  console.log(`   Applications:${appCount}`);
  console.log(`   AI Scores:   ${scoreCount}`);
  console.log(`   Interviews:  ${intvCount}`);
  console.log(`   Offers:      ${offerCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
