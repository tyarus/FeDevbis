"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { walletAPI } from "@/lib/wallet";

export default function AuthInitializer() {
  const { initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Ensure wallet account is created when user logs in
  useEffect(() => {
    if (user && user.id && user.role) {
      try {
        walletAPI.ensureAccountExists(user);
      } catch (err) {
        console.error("[AuthInitializer] Failed to ensure wallet account exists:", err);
      }
    }
  }, [user]);

  return null;
}
