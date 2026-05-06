"use client";

import { Order } from "@/types";
import { formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const timeline = [
    {
      stage: "Pesanan Dibuat",
      status: "completed",
      date: order.created_at,
    },
    {
      stage: "Pembayaran",
      status:
        order.status === "pending_payment"
          ? "pending"
          : ["paid", "processing", "shipped", "delivered", "completed"].includes(order.status)
          ? "completed"
          : "cancelled",
      date: order.updated_at,
    },
    {
      stage: "Diproses",
      status:
        order.status === "processing"
          ? "current"
          : ["shipped", "delivered", "completed"].includes(order.status)
          ? "completed"
          : order.status === "pending_payment" || order.status === "paid"
          ? "pending"
          : "cancelled",
      date: order.updated_at,
    },
    {
      stage: "Dikirim",
      status:
        order.status === "shipped" || order.status === "delivered"
          ? "current"
          : order.status === "completed"
          ? "completed"
          : ["pending_payment", "paid", "processing"].includes(order.status)
          ? "pending"
          : "cancelled",
      date: order.updated_at,
    },
    {
      stage: "Selesai",
      status: order.status === "completed" ? "completed" : "pending",
      date: order.updated_at,
    },
  ];

  return (
    <div className="space-y-6">
      {timeline.map((item, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${
                item.status === "completed"
                  ? "bg-accent-success text-white"
                  : item.status === "current"
                  ? "bg-accent-primary text-white"
                  : "bg-bg-secondary text-text-secondary"
              }`}
            >
              {item.status === "completed" ? (
                <CheckCircle2 size={20} />
              ) : (
                idx + 1
              )}
            </div>
            {idx < timeline.length - 1 && (
              <div
                className={`w-1 h-12 my-2 ${
                  item.status === "completed"
                    ? "bg-accent-success"
                    : "bg-bg-secondary"
                }`}
              />
            )}
          </div>
          <div className="pt-1">
            <p className="font-medium text-text-primary text-sm">{item.stage}</p>
            <p className="text-xs text-text-secondary mt-1">
              {formatDate(item.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
