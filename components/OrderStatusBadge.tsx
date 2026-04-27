"use client";

import { OrderStatus } from "@/types";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export function OrderStatusBadge({ status, size = "md" }: OrderStatusBadgeProps) {
  const label = getOrderStatusLabel(status);
  const { bg, text } = getOrderStatusColor(status);

  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs";

  return (
    <span className={`inline-block rounded-badge font-medium ${bg} ${text} ${sizeClass}`}>
      {label}
    </span>
  );
}
