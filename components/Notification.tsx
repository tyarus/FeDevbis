"use client";

import { useEffect, useState } from "react";
import { Bell, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationBell({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <div className="relative">
      <Bell size={20} className="text-text-secondary hover:text-text-primary cursor-pointer transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent-primary text-white text-xs rounded-full flex items-center justify-center font-semibold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}

export function NotificationItem({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.type !== "error") {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!isVisible) return null;

  const bgColor = {
    info: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
  }[notification.type];

  const textColor = {
    info: "text-blue-700",
    success: "text-green-700",
    warning: "text-yellow-700",
    error: "text-red-700",
  }[notification.type];

  const iconColor = {
    info: "text-blue-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
  }[notification.type];

  const Icon = {
    info: Clock,
    success: CheckCircle2,
    warning: AlertCircle,
    error: AlertCircle,
  }[notification.type];

  return (
    <div className={`${bgColor} border rounded-lg p-4 flex items-start gap-3 animate-slideIn`}>
      <Icon size={18} className={`${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`${textColor} font-semibold text-sm mb-1`}>{notification.title}</p>
        <p className={`${textColor} text-xs opacity-90`}>{notification.message}</p>
        {notification.actionUrl && notification.actionLabel && (
          <a
            href={notification.actionUrl}
            className={`${textColor} text-xs font-medium hover:underline mt-2 inline-block`}
          >
            {notification.actionLabel} →
          </a>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss();
        }}
        className={`${textColor} hover:opacity-70 flex-shrink-0 mt-0.5`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function NotificationContainer({ notifications, onDismiss }: NotificationListProps) {
  return (
    <div className="fixed top-20 right-4 space-y-3 max-w-md z-50 pointer-events-auto">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onDismiss={() => onDismiss(notif.id)}
        />
      ))}
    </div>
  );
}
