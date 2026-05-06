"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
import { useNotifications } from "@/lib/useNotifications";
import { useAuthStore } from "@/store/authStore";

export function NotificationDropdown() {
  const { notifications, unreadCount, isLoading, markAsRead, deleteNotification } = useNotifications();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Only show for sellers
  if (user?.role !== "seller") {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={16} className="text-yellow-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-text-secondary hover:text-text-primary cursor-pointer transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-accent-primary text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-96 bg-white border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Notifikasi</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                Loading notifikasi...
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                      notif.is_read
                        ? "border-l-transparent bg-white"
                        : "border-l-accent-primary bg-blue-50/30"
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-text-primary">
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          >
                            <X size={14} className="text-text-secondary" />
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.action_url && notif.action_label && (
                          <Link
                            href={notif.action_url}
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-accent-primary font-medium hover:underline mt-2 inline-block"
                          >
                            {notif.action_label} →
                          </Link>
                        )}
                        <p className="text-xs text-text-secondary mt-2">
                          {new Date(notif.created_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-secondary text-sm">
                Tidak ada notifikasi
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-border">
              <Link
                href="/seller/notifications"
                className="text-sm text-accent-primary font-medium hover:underline block text-center"
              >
                Lihat Semua Notifikasi
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
