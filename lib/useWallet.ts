"use client";

import { useEffect, useState } from "react";
import { User } from "@/types";
import { WalletOverview, walletAPI } from "@/lib/wallet";

export const useWalletOverview = (
  user: Pick<User, "id" | "role"> | null | undefined
): WalletOverview | null => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = walletAPI.subscribe(() => {
      setVersion((current) => current + 1);
    });

    return unsubscribe;
  }, []);

  void version;

  if (!user) return null;
  return walletAPI.getOverview(user);
};
