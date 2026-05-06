import { useAuthStore } from "@/store/authStore";
import useSWR from "swr";
import { apiClient } from "@/lib/api";

export interface Notification {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationResponse {
  data: Notification[];
  pagination: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export function useNotifications() {
  const { user } = useAuthStore();

  // Only fetch if user is logged in
  const { data, isLoading, mutate } = useSWR<any>(
    user ? "/notifications" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: unreadData } = useSWR<any>(
    user ? "/notifications/unread-count" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  const notifications = data?.data || [];
  const unreadCount = unreadData?.data?.unread_count || 0;

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/mark-as-read`);
      mutate();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put("/notifications/mark-all-as-read");
      mutate();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      mutate();
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    mutate,
  };
}
