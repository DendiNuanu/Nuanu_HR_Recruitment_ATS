"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore, useNotificationStore } from "@/stores";
import { demoNotifications } from "@/lib/demo-data";
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
  X,
  Check,
  CheckCheck,
  Briefcase,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
} from "lucide-react";

import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/dashboard/notifications/actions";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/jobs": "Job Requisitions",
  "/dashboard/candidates": "Candidate Pipeline",
  "/dashboard/pipeline": "Hiring Pipeline",
  "/dashboard/ai-scoring": "AI Match Scoring",
  "/dashboard/interviews": "Interviews",
  "/dashboard/screening": "Screening & Testing",
  "/dashboard/offers": "Offers & Contracts",
  "/dashboard/onboarding": "Employee Onboarding",
  "/dashboard/analytics": "Analytics & Reports",
  "/dashboard/settings": "Settings",
};

const notificationIcons: Record<string, React.ElementType> = {
  approval: AlertCircle,
  interview: Calendar,
  offer: FileText,
  system: Briefcase,
  reminder: Clock,
};

export default function Header() {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebarStore();
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    // For demo, we assume the first admin user is logged in
    const res = await getNotifications("current-user-id"); // We'll need to handle this properly
    if (res) setNotifications(res);
  };

  useEffect(() => {
    // In a real app, we'd get the current user ID from the session
    const syncNotifications = async () => {
      const data = await getNotifications(""); // Placeholder for all or specific user
      setNotifications(data);
    };
    syncNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(syncNotifications, 30000);
    return () => clearInterval(interval);
  }, [setNotifications]);

  const handleMarkRead = async (id: string) => {
    markAsRead(id);
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    markAllAsRead();
    await markAllNotificationsAsRead(""); 
  };

  const breadcrumbs = pathname.split("/").filter(Boolean);
  const pageTitle = pageTitles[pathname] || breadcrumbs[breadcrumbs.length - 1]?.replace(/-/g, " ") || "Dashboard";

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-nuanu-gray-200">
      <div className="flex items-center justify-between h-16 px-12">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-nuanu-gray-100 text-nuanu-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-nuanu-gray-400 mb-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  <span className={i === breadcrumbs.length - 1 ? "text-nuanu-gray-600 font-medium" : ""}>
                    {crumb.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </span>
              ))}
            </div>
            <h1 className="text-lg font-bold text-nuanu-navy capitalize">{pageTitle}</h1>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 rounded-xl hover:bg-nuanu-gray-100 text-nuanu-gray-500 transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-nuanu-gray-200 p-3"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search candidates, jobs, interviews..."
                      className="input-field pl-10 text-sm"
                      autoFocus
                    />
                  </div>
                  {searchQuery && (
                    <div className="mt-2 py-2 text-center text-sm text-nuanu-gray-400">
                      Search results for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl hover:bg-nuanu-gray-100 text-nuanu-gray-500 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-nuanu-error text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-nuanu-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-nuanu-gray-100">
                    <h3 className="font-semibold text-nuanu-navy">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-nuanu-emerald hover:text-nuanu-emerald-dark font-medium flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 rounded hover:bg-nuanu-gray-100"
                      >
                        <X className="w-4 h-4 text-nuanu-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => {
                        const Icon = notificationIcons[notif.type] || Bell;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkRead(notif.id)}
                            className={`flex items-start gap-3 p-4 hover:bg-nuanu-gray-50 cursor-pointer transition-colors border-b border-nuanu-gray-50 ${
                              !notif.isRead ? "bg-emerald-50/50" : ""
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              !notif.isRead ? "bg-nuanu-emerald/10 text-nuanu-emerald" : "bg-nuanu-gray-100 text-nuanu-gray-400"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${!notif.isRead ? "font-semibold text-nuanu-navy" : "text-nuanu-gray-600"}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-nuanu-gray-400 mt-0.5 truncate">{notif.message}</p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-nuanu-emerald flex-shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-nuanu-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-nuanu-gray-400">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
 
          {/* User Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nuanu-emerald to-nuanu-teal flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:shadow-lg hover:shadow-emerald-500/20 transition-all ml-1">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
