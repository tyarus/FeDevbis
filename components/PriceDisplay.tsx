"use client";

import { formatRupiah } from "@/lib/utils";

interface PriceDisplayProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({ amount, size = "md", className = "" }: PriceDisplayProps) {
  const sizeClass =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span className={`font-medium text-text-primary ${sizeClass} ${className}`}>
      {formatRupiah(amount)}
    </span>
  );
}
