"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Info, Calendar, Gift, Settings, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  approval: CheckCheck,
  interview: Calendar,
  offer: Gift,
  system: Settings,
  reminder: AlertCircle,
};

const TYPE_COLOR: Record<string, string> = {
  approval: "bg-emerald-100 text-emerald-600",
  interview: "bg-blue-100 text-blue-600",
  offer: "bg-amber-100 text-amber-600",
  system: "bg-purple-100 text-purple-600",
  reminder: "bg-orange-100 text-orange-600",
};

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const displayed = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {});
    toast.success("All notifications marked as read");
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-500" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Your activity feed and alerts</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2 py-2">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === f
                ? "bg-nuanu-navy text-white"
                : "bg-white border border-nuanu-gray-200 text-nuanu-gray-500 hover:text-nuanu-navy"
            }`}
          >
            {f === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {displayed.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card text-center py-16"
            >
              <Bell className="w-12 h-12 text-nuanu-gray-200 mx-auto mb-4" />
              <p className="text-lg font-bold text-nuanu-navy">No notifications</p>
              <p className="text-sm text-nuanu-gray-400 mt-1">
                {filter === "unread" ? "You're all caught up!" : "Activity will appear here."}
              </p>
            </motion.div>
          ) : (
            displayed.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Info;
              const colorClass = TYPE_COLOR[n.type] ?? "bg-gray-100 text-gray-600";

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`card flex items-start gap-4 p-4 transition-all ${
                    !n.isRead ? "border-l-4 border-l-emerald-500 bg-emerald-50/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold text-nuanu-navy ${!n.isRead ? "font-extrabold" : ""}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-nuanu-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-nuanu-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-2 hover:underline"
                      >
                        View details <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark as read"
                        className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      title="Delete"
                      className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
