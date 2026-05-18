"use client";

import { TransactionStatus } from "@/types";
import { getTransactionStatusColor, getTransactionStatusLabel } from "@/lib/utils";

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
  size?: "sm" | "md";
}

export function TransactionStatusBadge({
  status,
  size = "md",
}: TransactionStatusBadgeProps) {
  const label = getTransactionStatusLabel(status);
  const { bg, text, border } = getTransactionStatusColor(status);
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-badge border font-medium ${bg} ${text} ${border} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
