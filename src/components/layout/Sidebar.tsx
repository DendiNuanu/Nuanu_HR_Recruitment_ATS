"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores";
import { getIntegrationSettings } from "@/app/actions/settings";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Kanban,
  Calendar,
  ClipboardCheck,
  FileText,
  UserPlus,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Brain,
  X,
  Shield,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowed: ["admin", "super-admin", "hr", "recruiter", "manager"],
  },
  {
    label: "Jobs & Vacancies",
    href: "/dashboard/jobs",
    icon: Briefcase,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Approvals",
    href: "/dashboard/requisitions",
    icon: ClipboardCheck,
    allowed: ["admin", "super-admin", "hr", "finance", "manager"],
  },
  {
    label: "Candidates",
    href: "/dashboard/candidates",
    icon: Users,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Pipeline",
    href: "/dashboard/pipeline",
    icon: Kanban,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "AI Scoring",
    href: "/dashboard/ai-scoring",
    icon: Brain,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Interviews",
    href: "/dashboard/interviews",
    icon: Calendar,
    allowed: ["admin", "super-admin", "hr", "recruiter", "interviewer"],
  },
  {
    label: "Assessment",
    href: "/dashboard/screening",
    icon: BarChart3,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Offers",
    href: "/dashboard/offers",
    icon: FileText,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Onboarding",
    href: "/dashboard/onboarding",
    icon: UserPlus,
    allowed: ["admin", "super-admin", "hr", "recruiter"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    allowed: ["admin", "super-admin"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } =
    useSidebarStore();
  const [logo, setLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Nuanu");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      // ── Branding: read from localStorage cache first ─────────────────────────
      // Only hits the DB if cache is missing or older than 10 minutes.
      const CACHE_TTL = 10 * 60 * 1000; // 10 min
      try {
        const cached = localStorage.getItem("nuanu_branding");
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            if (data.logo) setLogo(data.logo);
            if (data.companyName) setCompanyName(data.companyName);
            // Still load user below
            const storedUser = localStorage.getItem("nuanu_user");
            if (storedUser) setUser(JSON.parse(storedUser));
            return;
          }
        }
      } catch {
        // ignore malformed cache
      }

      // ── Fetch from server and populate cache ─────────────────────────────────
      const settings = await getIntegrationSettings("general_info");
      const brandData = {
        logo: (settings?.config as any)?.logo ?? null,
        companyName: (settings?.config as any)?.companyName ?? "Nuanu",
      };
      try {
        localStorage.setItem(
          "nuanu_branding",
          JSON.stringify({ data: brandData, ts: Date.now() }),
        );
      } catch {
        // ignore storage errors (private browsing, quota, etc.)
      }
      if (brandData.logo) setLogo(brandData.logo);
      setCompanyName(brandData.companyName);

      // ── User ─────────────────────────────────────────────────────────────────
      const storedUser = localStorage.getItem("nuanu_user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("nuanu_user");
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const userRoles = user?.roles?.map((r: string) => r.toLowerCase()) || [];

  const filteredMenuItems = menuItems.filter((item) => {
    if (userRoles.includes("super-admin")) return true;
    return item.allowed.some((role) => userRoles.includes(role));
  });

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="h-[72px] flex items-center justify-between px-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          {logo ? (
            <img
              src={logo}
              alt={companyName}
              className="w-9 h-9 rounded-lg object-contain bg-white/10"
            />
          ) : (
            <Image
              src="/nuanu-logo.png"
              alt="Nuanu"
              width={36}
              height={36}
              className="rounded-lg flex-shrink-0"
            />
          )}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0"
            >
              <h1 className="text-[15px] font-bold text-white leading-tight">
                {companyName}
              </h1>
              <p className="text-[10px] text-emerald-400/70 font-semibold tracking-[0.12em] uppercase leading-tight">
                Recruitment ATS
              </p>
            </motion.div>
          )}
        </Link>
        <button
          onClick={() => {
            toggle();
            setMobileOpen(false);
          }}
          className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 hidden lg:flex items-center justify-center"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${isActive(item.href) ? "active" : ""} ${isCollapsed ? "justify-center px-3" : ""}`}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!isCollapsed && (
              <span className="truncate text-[13px]">{item.label}</span>
            )}
            {isActive(item.href) && !isCollapsed && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-white/[0.06]">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">
                {user?.name || "Super Admin"}
              </p>
              <p className="text-gray-500 text-[11px] truncate leading-tight mt-0.5">
                {user?.email || "admin@nuanu.com"}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full hover:bg-red-500/10 hover:text-red-400 ${isCollapsed ? "justify-center px-3" : ""}`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!isCollapsed && <span className="text-[13px]">Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex flex-col h-screen bg-gradient-to-b from-nuanu-navy to-nuanu-navy-dark fixed left-0 top-0 z-50 border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
      >
        {sidebarContent}
      </motion.aside>

      {/* Desktop Sidebar Placeholder (to push content) */}
      <motion.div
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:block flex-shrink-0"
        style={{ width: isCollapsed ? "80px" : "280px" }}
      />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[256px] flex flex-col bg-nuanu-navy z-50 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
